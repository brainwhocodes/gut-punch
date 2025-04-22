/**
 * Drizzle ORM setup for SQLite.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, sql } from "drizzle-orm";
import { jobs, scheduledJobs, jobRuns } from "./schema";
import type { JobStatus } from "./types";

/**
 * Create and export Drizzle DB instance using better-sqlite3.
 */
export function createDb(file: string) {
  const sqlite = new Database(file);
  return drizzle(sqlite);
}

/**
 * DB helper methods for job runs.
 */

export interface JobRunRecord {
  id?: number;
  job_name: string;
  queue_name: string;
  priority: number;
  status: string;
  started_at?: string;
  finished_at?: string;
  output?: string;
  error?: string;
}

export interface JobRecord {
  job_name: string;
  /** Optional initial status */
  status?: JobStatus;
  /** Optional automatic reschedule flag */
  reschedule?: boolean;
  /** Optional automatic reschedule delay (ms) */
  reschedule_in?: number | null;
}

export interface ScheduledJobRecord {
  job_name: string;
  next_run: string;
} 

export interface JobDefinitionRecord {
  job_name: string;
  status: JobStatus;
  reschedule: boolean;
  reschedule_in: number | null;
}

export class JobDb {
  private readonly db: ReturnType<typeof drizzle>;

  constructor(file: string) {
    const sqlite = new Database(file);
    this.db = drizzle(sqlite);
  }

  /** Insert a new job run. */
  /**
   * Insert a new job run.
   * @param run JobRunRecord
   * @returns id of inserted job run
   */
  public async insertJobRun(run: JobRunRecord): Promise<number> {
    console.log(`[DB] Inserting job run:`, run);
    const result = await this.db.insert(jobRuns).values(run);
    // Drizzle returns lastInsertRowid for better-sqlite3
    const rid = (result as any).lastInsertRowid;
    console.log(`[DB] Inserted job run with id:`, rid);
    return typeof rid === 'bigint' ? Number(rid) : rid;
  }

  /** Update job run status and metadata. */
  /**
   * Update job run status and metadata.
   * @param id JobRunRecord id
   * @param updates Partial fields to update
   */
  public async updateJobRun(id: number, updates: Partial<JobRunRecord>): Promise<void> {
    console.log(`[DB] Updating job run id ${id} with:`, updates);
    if (Object.keys(updates).length === 0) return;
    await this.db.update(jobRuns).set(updates).where(eq(jobRuns.id, id));
    console.log(`[DB] Updated job run id ${id}`);
  }

  /**
   * Inserts a new job definition into the database.
   * If a job with the same name already exists, it does nothing.
   */
  public async insertJobDefinition(job: JobDefinitionRecord): Promise<void> {
    console.log("[DB] Inserting job definition:", job);
    await this.db.insert(jobs).values(job).onConflictDoNothing();
    console.log(`[DB] Inserted job definition: ${job.job_name}`);
  }

  /**
   * Inserts a new job definition or updates an existing one based on job_name.
   * Updates status, reschedule, and reschedule_in fields on conflict.
   */
  public async upsertJobDefinition(job: JobDefinitionRecord): Promise<void> {
    console.log("[DB] Upserting job definition:", job);
    await this.db.insert(jobs).values(job).onConflictDoUpdate({
      target: jobs.job_name, // Conflict target
      set: { // Fields to update on conflict
        status: job.status, // Reset status on load
        reschedule: job.reschedule,
        reschedule_in: job.reschedule_in,
        // Do not update last_run_at here
      },
    });
    console.log(`[DB] Upserted job definition: ${job.job_name}`);
  }

  /**
   * Updates the status of a specific job definition.
   */
  public async updateJobDefinitionStatus(jobName: string, status: JobStatus): Promise<void> {
    console.log(`[DB] Updating job definition status for ${jobName} to ${status}`);
    await this.db.update(jobs).set({ status }).where(eq(jobs.job_name, jobName));
  }

  /** Upsert a scheduled job (insert or update next_run). */
  /**
   * Upsert a scheduled job (insert or update next_run).
   * @param job ScheduledJobRecord
   */
  public async upsertScheduledJob(job: ScheduledJobRecord): Promise<void> {
    console.log(`[DB] Upserting scheduled job:`, job);
    await this.db
      .insert(scheduledJobs)
      .values(job)
      .onConflictDoUpdate({
        target: scheduledJobs.job_name,
        set: { next_run: job.next_run }
      });
    console.log(`[DB] Upserted scheduled job:`, job.job_name, '->', job.next_run);
  }

  /** Get all scheduled jobs due to run. */
  /**
   * Get all scheduled jobs due to run.
   * @param now ISO string for current time
   * @returns Array of ScheduledJobRecord
   */
  public async getDueScheduledJobs(now: string): Promise<ScheduledJobRecord[]> {
    console.log(`[DB] Querying due scheduled jobs at ${now}`);
    const rows = await this.db
      .select()
      .from(scheduledJobs)
      .where(sql`${scheduledJobs.next_run} <= ${now}`);
    return rows.map(row => ({
      job_name: row.job_name as string,
      next_run: row.next_run as string,
    }));
  }

  /** Get all scheduled jobs */
  public async getAllScheduledJobs(): Promise<ScheduledJobRecord[]> {
    console.log(`[DB] Querying all scheduled jobs`);
    const rows = await this.db.select().from(scheduledJobs);
    return rows.map(row => ({
      job_name: row.job_name as string,
      next_run: row.next_run as string,
    }));
  }

  /** Remove a scheduled job (one-time jobs). */
  /**
   * Remove a scheduled job (one-time jobs).
   * @param jobName string
   */
  public async removeScheduledJob(jobName: string): Promise<void> {
    console.log(`[DB] Removing scheduled job: ${jobName}`);
    await this.db.delete(scheduledJobs).where(eq(scheduledJobs.job_name, jobName));
    console.log(`[DB] Removed scheduled job: ${jobName}`);
  }

  /** Get a job definition record from the jobs table. */
  public async getJobDefinition(jobName: string): Promise<JobDefinitionRecord> {
    const row = await this.db.select().from(jobs).where(eq(jobs.job_name, jobName)).get();
    if (!row) {
      throw new Error(`Job definition not found: ${jobName}`);
    }
    return {
      job_name: row.job_name,
      status: row.status,
      reschedule: Boolean(row.reschedule),
      reschedule_in: row.reschedule_in === null ? null : Number(row.reschedule_in),
    };
  }
}
