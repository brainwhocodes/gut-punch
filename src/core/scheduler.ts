/**
 * Scheduler: Loads jobs, manages queues, and schedules execution.
 */
// Using standard imports for Bun compatibility
import { readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadConfig, GutPunchConfig } from "../config/index";
import { JobDb, JobDefinitionRecord, JobRunRecord, ScheduledJobRecord } from "../db/drizzle"; // Added types
import { JobRunStatus, QueuePriority, JobDefinitionStatus } from "./enums"; // Import enums

import { PriorityQueue, QueueItem } from "./queue"; // Import QueueItem
import { BaseJob } from "./base-job";

/**
 * Type representing a constructor for a class that extends BaseJob.
 */
type JobConstructor = new (config: GutPunchConfig, db: JobDb) => BaseJob;

/**
 * Scheduler class for Gut Punch.
 */
export class Scheduler {
  private readonly config: GutPunchConfig;
  private readonly db: JobDb; // db is now potentially conditional
  private readonly queues: Record<string, PriorityQueue> = {};
  private readonly jobs: Record<string, BaseJob> = {};
  private pollingIntervalId: Timer | null = null; // Store interval ID

  constructor(configDir: string = ".") {
    console.log(`[Scheduler] Initializing with config directory: ${configDir}`);
    try {
      this.config = loadConfig(configDir); // Pass configDir to loadConfig
      
      // Initialize DB based on mode
      if (this.config.database.mode === 'standalone') {
        if (!this.config.database.file) {
          throw new Error("[Scheduler] Database mode is 'standalone' but 'database.file' is missing in config.");
        }
        console.log(`[Scheduler] Initializing standalone database: ${this.config.database.file}`);
        this.db = new JobDb(this.config.database.file);
      } else if (this.config.database.mode === 'external') {
        // TODO: Implement external database connection logic
        console.error("[Scheduler] FATAL: 'external' database mode is not yet supported.");
        throw new Error("'external' database mode is not yet supported.");
        // Placeholder: this.db = connectToExternalDb(this.config.database.connectionDetails);
      } else {
        // Should be caught by config validation, but good practice to check
        throw new Error(`[Scheduler] Invalid database mode: ${this.config.database.mode}`);
      }

      // Explicitly define expected queue names based on the enum
      const queueNames = ['high', 'default', 'low'];
      for (const name of queueNames) {
        const enumKey = name.charAt(0).toUpperCase() + name.slice(1) as keyof typeof QueuePriority;
        const priority = QueuePriority[enumKey];
        this.queues[name] = new PriorityQueue(); // Use the lowercase name as key
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

        let JobClass: JobConstructor | undefined = undefined;
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
          // Type check ensures JobClass is constructible with config and db
          const jobInstance: BaseJob = new JobClass(this.config, this.db);
          const jobName = jobInstance.name; // Get name from instance
          if (!jobName) {
             console.warn(`[Scheduler] Job loaded from ${file} does not have a 'name' property.`);
             continue;
          }
          const jobDef: JobDefinitionRecord = {
            job_name: jobName,
            status: JobDefinitionStatus.Pending, // Use Enum
            reschedule: jobInstance.reschedule ?? false,
            reschedule_in: jobInstance.rescheduleIn ?? null, // Use property name
          };

          // Store job instance
          this.jobs[jobName] = jobInstance;

          // Upsert job definition in DB (use Pending status initially)
          await this.db.upsertJobDefinition(jobDef);

          console.log(`[Scheduler] Loaded and registered job: ${jobName}`);
          // Scheduling logic:
          if (jobInstance.reschedule && typeof jobInstance.rescheduleIn === 'number') {
            // This is for jobs that run, then reschedule themselves after a delay.
            // This is the first run scheduling. Subsequent reschedules are handled in runNextJob.
            const nextRunIso = new Date(Date.now() + jobInstance.rescheduleIn).toISOString();
            console.log(`[Scheduler] Job ${jobName} is configured to run and then reschedule. Initial schedule at: ${nextRunIso} (in ${jobInstance.rescheduleIn}ms)`);
            await this.db.upsertScheduledJob({ job_name: jobName, next_run: nextRunIso });
          } else {
            // This is a one-off job (no cron, no rescheduleIn config, or rescheduleIn is not a number).
            // Schedule it for immediate execution.
            const nextRunIso = new Date().toISOString(); 
            console.log(`[Scheduler] Job ${jobName} is a one-off or has no specific recurring schedule. Scheduling for immediate run: ${nextRunIso}`);
            await this.db.upsertScheduledJob({ job_name: jobName, next_run: nextRunIso });
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
    if (this.pollingIntervalId) {
      console.warn("[Scheduler] Polling already active. Clearing existing interval before starting a new one.");
      clearInterval(this.pollingIntervalId);
    }
    this.pollingIntervalId = setInterval(() => {
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
      const job = this.jobs[row.job_name]; // Get the job instance
      if (!job) {
        console.error(`[Scheduler] Job instance '${row.job_name}' not found in memory during enqueue.`);
        continue;
      }
      const queueName = job.queue || "default"; // Get queue name from job or default
      const priority = this.config.queues[queueName]?.priority ?? QueuePriority.Default; // Use Enum

      const runRecord: JobRunRecord = {
        job_name: row.job_name,
        queue_name: queueName,
        priority: priority,
        status: JobRunStatus.Pending, // Use Enum
      };
      const runId = await this.db.insertJobRun(runRecord);

      const queue = this.queues[queueName];
      if (!queue) {
        console.error(`[Scheduler] Queue '${queueName}' not found for job '${row.job_name}'`);
        await this.db.updateJobRun(runId, { status: JobRunStatus.Failed, error: "Queue not found" }); // Use Enum
        return; // Skip job if queue doesn't exist
      }

      // Enqueue with job, runId, and priority
      queue.enqueue(job, runId, priority);
      console.log(`[Scheduler] Enqueued job ${row.job_name} (runId: ${runId}) in queue ${queueName} with priority ${priority}`);
    }
  }

  /**
   * Run the next job in the queue if any, with retry and status tracking. Supports variable scheduling.
   */
  private async runNextJob(queueName: string): Promise<void> {
    let runId: number | undefined = undefined;
    try {
       // Dequeue returns QueueItem which includes job and runId
      const queueItem: QueueItem | undefined = this.queues[queueName].dequeue();

      if (!queueItem) {
        // console.log(`[Scheduler] Queue ${queueName} is empty.`);
        return; // Nothing to run
      }

      const { job, runId: currentRunId } = queueItem;
      runId = currentRunId; // Assign runId here

      console.log(`[Scheduler] Running job ${job.name} (runId: ${runId}) from queue ${queueName}`);

      // Update job run status to Running
      await this.db.updateJobRun(runId, { status: JobRunStatus.Running, started_at: new Date().toISOString() }); // Use Enum

      try {
        const output = await job.run();
        console.log(`[Scheduler] Job ${job.name} (runId: ${runId}) completed successfully.`);

        // Update job run status to Success
        await this.db.updateJobRun(runId, { status: JobRunStatus.Success, finished_at: new Date().toISOString(), output: output?.output ? JSON.stringify(output.output) : null }); // Use Enum and stringify output

        // Handle rescheduling if needed
        if (job.reschedule && job.rescheduleIn) { // Use property name
          const nextRunIso = new Date(Date.now() + job.rescheduleIn).toISOString(); // Use property name
          await this.db.upsertScheduledJob({ job_name: job.name, next_run: nextRunIso });
          console.log(`[Scheduler] Rescheduled job in DB: ${job.name} -> next_run ${nextRunIso}`);
        } else {
          await this.db.removeScheduledJob(job.name);
          console.log(`[Scheduler] Removed one-time job: ${job.name}`);
        }
      } catch (error) {
        console.error(`[Scheduler] Job ${job.name} (runId: ${runId}) failed:`, error);

        // Update job run status to Failed
        await this.db.updateJobRun(runId, { status: JobRunStatus.Failed, finished_at: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) }); // Use Enum and better error handling

        // Handle retries if configured
        // TODO: Implement retry logic
      }
    } catch (error) {
      console.error(`[Scheduler] Error running job in queue ${queueName}:`, error);
    }
  }

  /**
   * Stops the scheduler, clears any running intervals, and closes the database connection.
   */
  public stop(): void {
    console.log("[Scheduler] Stopping scheduler...");
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
      console.log("[Scheduler] Polling interval cleared.");
    }
    if (this.db) {
      this.db.closeDb(); // This now correctly closes the underlying bun:sqlite connection
    }
    console.log("[Scheduler] Scheduler stopped.");
  }
}
