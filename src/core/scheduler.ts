/**
 * Scheduler: Loads jobs, manages queues, and schedules execution.
 */
import { readdirSync, existsSync } from "node:fs"; // Use node: prefix
import { join, resolve } from "node:path"; // Use node: prefix
import { pathToFileURL } from "node:url"; // Use node: prefix
import { loadConfig, GutPunchConfig } from "../config/index";
import { JobDb } from "../db/drizzle";

import { PriorityQueue } from "./queue";
import { BaseJob } from "./base-job";

/**
 * Local constant for job run statuses to avoid enum import issues.
 */
const JOB_RUN_STATUS = {
  Pending: "pending",
  Running: "running",
  Success: "success",
  Failed: "failed",
  Retrying: "retrying"
} as const;

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

  constructor(configPath: string = "config.yaml") {
    console.log(`[Scheduler] Initializing with config path: ${configPath}`);
    try {
      this.config = loadConfig(configPath); // Load config first
      this.db = new JobDb(this.config.database.file); // Initialize DB
      // Ensure default queues
      for (const [name, priority] of Object.entries(QUEUE_PRIORITIES)) {
        this.queues[name] = new PriorityQueue();
        if (!this.config.queues[name]) {
          this.config.queues[name] = { priority };
        }
      }
      console.log(`[Scheduler] Initialization complete.`);
    } catch (error: any) {
      console.error(`[Scheduler] FATAL: Initialization failed: ${error.message}`);
      // Optionally re-throw or exit process if initialization is critical
      // throw error; 
      process.exit(1); // Exit if scheduler cannot initialize
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
    // Resolve the directory where Vite outputs the bundled job files
    const jobsDir: string = resolve(this.config.jobsDirectory);
    console.log(`[Scheduler] Attempting to load jobs from configured directory: ${this.config.jobsDirectory}, resolved to: ${jobsDir}`);

    if (!existsSync(jobsDir)) {
      console.log(`[Scheduler] Jobs directory not found: ${jobsDir}`);
      return; // No jobs to load
    }

    console.log(`[Scheduler] Jobs directory found: ${jobsDir}`);

    // Read files directly from the resolved jobs directory
    const files: string[] = readdirSync(jobsDir);
    console.log(`[Scheduler] Files in jobs directory: ${files.join(', ')}`);

    // Filter for .cjs files, excluding source maps
    const jobFiles: string[] = files.filter(
      (file: string) => file.endsWith(".cjs") && !file.endsWith(".map")
    );
    console.log(
      `[Scheduler] Filtered CJS job files: ${jobFiles.join(', ') || 'None'}`
    );

    if (jobFiles.length === 0) {
      console.log(`[Scheduler] No job files (.cjs) found in ${jobsDir}.`);
      return; // No jobs to load
    }

    for (const file of jobFiles) {
      const filePath: string = join(jobsDir, file);
      console.log(`[Scheduler] Attempting to load job from file: ${filePath}`);
      try {
        // Use pathToFileURL().href for cross-platform compatibility with dynamic import
        const moduleUrl = pathToFileURL(filePath).href;
        console.log(`[Scheduler] Loading module URL: ${moduleUrl}`);
        const jobModule = await import(moduleUrl);
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
          const jobName = jobInstance.name; // Get name from instance
          if (!jobName) {
             console.warn(`[Scheduler] Job loaded from ${file} does not have a 'name' property.`);
             continue;
          }
          this.jobs[jobName] = jobInstance;
          console.log(`[Scheduler] Successfully loaded and instantiated job: ${jobName}`);
          // Upsert job definition (insert or update)
          console.log(`[Scheduler] Upserting job definition in DB: ${jobName}`);
          await this.db.upsertJobDefinition({
            job_name: jobName,
            status: JOB_RUN_STATUS.Pending, // Use local constant
            reschedule: jobInstance.reschedule ?? false,
            reschedule_in: jobInstance.rescheduleIn ?? null,
          });
          console.log(`[Scheduler] Upserted job definition in DB: ${jobName}`);
          // Initial scheduling based on reschedule/rescheduleIn
          if (jobInstance.reschedule && jobInstance.rescheduleIn) {
            const nextRunIso = new Date(Date.now() + jobInstance.rescheduleIn).toISOString();
            console.log(`[Scheduler] Scheduling job in DB: ${jobName} -> next_run ${nextRunIso}`);
            await this.db.upsertScheduledJob({ job_name: jobName, next_run: nextRunIso });
            console.log(`[Scheduler] Scheduled job in DB: ${jobName} -> next_run ${nextRunIso}`);
          }
        } else {
          console.warn(`[Scheduler] Could not find a valid job export (class extending BaseJob or with static isGutPunchJob=true) in ${file}. Module exports:`, Object.keys(jobModule));
        }
      } catch (error) {
        console.error(`[Scheduler] Error loading job from ${file}:`, error);
      }
    }

    if (Object.keys(this.jobs).length === 0 && jobFiles.length > 0) {
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
      
      // Get the job definition from the database to use the most current settings
      const dbJobDef = await this.db.getJobDefinition(job.name);
      const shouldReschedule = dbJobDef?.reschedule ?? job.reschedule;
      const rescheduleTimeMs = dbJobDef?.reschedule_in ?? job.rescheduleIn;
      
      if (shouldReschedule && rescheduleTimeMs) {
        // Use database values for rescheduling if available, fall back to in-memory values
        const nextRunIso = new Date(Date.now() + rescheduleTimeMs).toISOString();
        await this.db.upsertScheduledJob({ job_name: job.name, next_run: nextRunIso });
        console.log(`[Scheduler] Rescheduled job in DB: ${job.name} -> next_run ${nextRunIso} (using ${dbJobDef ? 'DB' : 'memory'} settings)`);
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
      const status: string = attempt === 1 ? JOB_RUN_STATUS.Running : JOB_RUN_STATUS.Retrying;
      if (!runId) {
        runId = await this.db.insertJobRun({
          job_name: job.name,
          queue_name: queueName,
          priority,
          status,
          started_at: startedAt,
        });
        } else {
        await this.db.updateJobRun(runId, { status });
      }
      try {
        const result = await job.run();
        await this.db.updateJobRun(runId, {
          status: JOB_RUN_STATUS.Success,
          finished_at: new Date().toISOString(),
          output: result.output ? JSON.stringify(result.output) : undefined,
          error: result.error,
        });
        // We don't update the job definition status on success
        return;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        await this.db.updateJobRun(runId, {
          status: attempt < maxRetries ? JOB_RUN_STATUS.Retrying : JOB_RUN_STATUS.Failed,
          error: lastError,
        });
      }
    }
    // All retries failed
    if (runId) {
      await this.db.updateJobRun(runId, {
        status: JOB_RUN_STATUS.Failed,
        finished_at: new Date().toISOString(),
        error: lastError,
      });
      // Update job definition status to disabled
      console.log(`[Scheduler] Job ${job.name} failed permanently. Updating definition status to disabled.`);
      await this.db.updateJobDefinitionStatus(job.name, "disabled"); // Set definition to disabled
    }
  }
}
