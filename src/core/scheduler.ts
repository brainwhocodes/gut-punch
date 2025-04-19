/**
 * Scheduler: Loads jobs, manages queues, and schedules execution.
 */
import { readdirSync, existsSync } from "fs";
import { join, resolve } from "path";
import { pathToFileURL } from "url";
import { loadConfig, GutPunchConfig } from "../config";
import { JobDb, JobRunRecord } from "../db/drizzle";

import { PriorityQueue, QueueItem } from "./queue";
import type { Job } from "./types"; 
import { JobStatus } from "./types";
import { BaseJob } from "./base-job"; 
import { sql } from "drizzle-orm";

/**
 * Queue priorities (lower is higher priority)
 */
const QUEUE_PRIORITIES = {
  high: 0,
  default: 1,
  low: 2,
} as const;

/**
 * Scheduler class for Gut Punch.
 */
export class Scheduler {
  private readonly config: GutPunchConfig;
  private readonly db: JobDb;
  private readonly queues: Record<string, PriorityQueue> = {};
  private readonly jobs: Record<string, BaseJob> = {};

  constructor() {
    this.config = loadConfig();
    this.db = new JobDb(this.config.database.file);
    // Ensure default queues
    for (const [name, priority] of Object.entries(QUEUE_PRIORITIES)) {
      this.queues[name] = new PriorityQueue();
      if (!this.config.queues[name]) {
        this.config.queues[name] = { priority };
      }
    }
  }

  /**
   * Start the scheduler and load jobs from the jobs directory.
   */
  public async start(): Promise<void> {
    // Ensure DB schema
    await this.ensureSchema();
    // Load jobs
    await this.loadJobs();
    // Schedule jobs
    this.scheduleJobs();
  }

  /**
   * Ensure the job_runs, scheduled_jobs, and jobs tables exist.
   * (Schema is now managed via Drizzle ORM migrations.)
   */
  private async ensureSchema(): Promise<void> {
    console.log("[Scheduler] Schema is managed via Drizzle ORM migrations. No manual table creation needed.");
  }

  /**
   * Dynamically load all job classes from the jobs directory.
   */
  private async loadJobs(): Promise<void> {
    const baseJobsDir = resolve(this.config.jobsDirectory);
    const jobsDir = join(baseJobsDir, 'src', 'jobs'); // Adjust path based on tsconfig.jobs.json rootDir/outDir
    if (!existsSync(jobsDir)) {
      console.warn(`[Scheduler] Jobs directory not found: ${jobsDir}. No jobs loaded.`)
      return;
    }
    const files = readdirSync(jobsDir).filter(f => f.endsWith(".js"));
    console.log(`[Scheduler] Found ${files.length} potential job files in ${jobsDir}:`, files);

    if (files.length === 0) {
      return; // Exit early if no files found
    }

    for (const file of files) {
      console.log(`[Scheduler] Attempting to load module: ${join(jobsDir, file)}`);
      const fullPath = join(jobsDir, file);
      try {
        console.log(`[Scheduler] Loading module: ${fullPath}`);
        // Use pathToFileURL().href for cross-platform compatibility with dynamic import
        const jobModule = await import(pathToFileURL(fullPath).href);
        console.log(`[Scheduler] Successfully imported module: ${file}`);

        let JobClass: any = undefined;
        let foundJobExport = false;
        console.log(`[Scheduler] Inspecting exports in module: ${file}`);

        // Iterate over all exports to find the one extending BaseJob
        for (const exportName in jobModule) {
          const potentialClass = jobModule[exportName];

          // Check if it's a class constructor and if its prototype has the static property
          if (potentialClass && typeof potentialClass === 'function' && potentialClass.isGutPunchJob === true) {
            JobClass = potentialClass;
            console.log(`[Scheduler] Found valid job export in ${file}`);
            foundJobExport = true;
            break; // Found the job class, stop searching
          }
        }

        if (foundJobExport && JobClass) {
          console.log(`[Scheduler] Instantiating job: ${file}`);
          const jobInstance = new JobClass(this.config, this.db) as BaseJob;
          this.jobs[jobInstance.name] = jobInstance;
          console.log(`[Scheduler] Successfully loaded and instantiated job: ${jobInstance.name}`);
          // Persist job definition
          console.log(`[Scheduler] Persisting job definition to DB: ${jobInstance.name}`);
          await this.db.insertJob({
            job_name: jobInstance.name,
            status: JobStatus.Pending,
            reschedule: jobInstance.reschedule ?? false,
            reschedule_in: jobInstance.rescheduleIn ?? null,
          });
          console.log(`[Scheduler] Persisted job definition to DB: ${jobInstance.name}`);
          // Initial scheduling based on reschedule/rescheduleIn
          if (jobInstance.reschedule && jobInstance.rescheduleIn) {
            const nextRunIso = new Date(Date.now() + jobInstance.rescheduleIn).toISOString();
            console.log(`[Scheduler] Scheduling job in DB: ${jobInstance.name} -> next_run ${nextRunIso}`);
            await this.db.upsertScheduledJob({ job_name: jobInstance.name, next_run: nextRunIso });
            console.log(`[Scheduler] Scheduled job in DB: ${jobInstance.name} -> next_run ${nextRunIso}`);
          }
        } else {
          console.warn(`[Scheduler] Could not find a valid export with static property isGutPunchJob=true in ${file}. Module exports:`, Object.keys(jobModule));
        }
      } catch (error) {
        console.error(`[Scheduler] Error loading job from ${file}:`, error);
      }
    }

    if (Object.keys(this.jobs).length === 0 && files.length > 0) {
      console.log("[Scheduler] Finished processing files, but no valid jobs were loaded.");
    } else if (Object.keys(this.jobs).length > 0) {
      console.log(`[Scheduler] Finished loading. Total jobs loaded: ${Object.keys(this.jobs).length}`);
    }
  }

  /**
   * Poll persistent scheduled_jobs table and run due jobs.
   */
  private scheduleJobs(): void {
    setInterval(() => {
      console.log("[Scheduler] Polling scheduled jobs and processing queues...");
      this.pollAndEnqueueJobs().catch(err => console.error("[Scheduler] Error polling scheduled jobs:", err));
      for (const queueName of Object.keys(this.queues)) {
        this.runNextJob(queueName).catch(err => console.error(`[Scheduler] Error running job in queue ${queueName}:`, err));
      }
    }, 1000);
  }

  /**
   * Poll the scheduled_jobs table for due jobs and enqueue them.
   */
  private async pollAndEnqueueJobs(): Promise<void> {
    const now = new Date().toISOString();
    const rows = await this.db.getDueScheduledJobs(now);
    for (const row of rows) {
      const job = this.jobs[row.job_name];
      if (!job) {
        console.warn(`[Scheduler] Scheduled job not found in memory: ${row.job_name}`);
        continue;
      }
      const queueName = "default";
      const priority = this.config.queues[queueName].priority;
      this.queues[queueName].enqueue({ job, priority });
      console.log(`[Scheduler] Dispatched job: ${job.name} (scheduled)`);
      if (job.reschedule && job.rescheduleIn) {
        const nextRunIso = new Date(Date.now() + job.rescheduleIn).toISOString();
        await this.db.upsertScheduledJob({ job_name: job.name, next_run: nextRunIso });
        console.log(`[Scheduler] Rescheduled job in DB: ${job.name} -> next_run ${nextRunIso}`);
      } else {
        await this.db.removeScheduledJob(job.name);
        console.log(`[Scheduler] Removed one-time job: ${job.name}`);
      }
    }
  }

  /**
   * Run the next job in the queue if any, with retry and status tracking. Supports variable scheduling.
   */
  private async runNextJob(queueName: string): Promise<void> {
    const queue = this.queues[queueName];
    const item = queue.dequeue();
    if (!item) return;
    const { job, priority } = item;
    const startedAt = new Date().toISOString();
    const maxRetries = typeof job.maxRetries === "number" ? job.maxRetries : 3;
    let attempt = 0;
    let lastError: string | undefined = undefined;
    let runId: number | undefined = undefined;
    while (attempt < maxRetries) {
      attempt++;
      const status: JobStatus = attempt === 1 ? JobStatus.Running : JobStatus.Retrying;
      if (!runId) {
        runId = await this.db.insertJobRun({
          job_name: job.name,
          queue_name: queueName,
          priority,
          status,
          started_at: startedAt,
        });
        // Update job definition status to running
        await this.db.updateJobDefinitionStatus(job.name, JobStatus.Running);
      } else {
        await this.db.updateJobRun(runId, { status });
      }
      try {
        const result = await job.run();
        await this.db.updateJobRun(runId, {
          status: result.status,
          finished_at: new Date().toISOString(),
          output: result.output ? JSON.stringify(result.output) : undefined,
          error: result.error,
        });
        // Update job definition status based on result
        await this.db.updateJobDefinitionStatus(job.name, result.status);
        // Automatic reschedule handled via reschedule/rescheduleIn logic above
        return;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        await this.db.updateJobRun(runId, {
          status: attempt < maxRetries ? JobStatus.Retrying : JobStatus.Failed,
          error: lastError,
        });
      }
    }
    // All retries failed
    if (runId) {
      await this.db.updateJobRun(runId, {
        status: JobStatus.Failed,
        finished_at: new Date().toISOString(),
        error: lastError,
      });
      // Update job definition status to failed
      await this.db.updateJobDefinitionStatus(job.name, JobStatus.Failed);
    }
  }
}
