import { Job, JobResult, BackoffStrategy } from "./types.js";
import { GutPunchConfig } from "../config/index.js"; // Correct import path
import { JobDb } from "../db/drizzle.js"; // Use JobDb from drizzle

/**
 * Abstract base class for all jobs.
 * Provides common properties and requires implementation of run and optionally getNextRunDate.
 */
export abstract class BaseJob implements Job {
  /** Static property to identify GutPunch jobs reliably across modules. */
  static readonly isGutPunchJob = true;

  /** Unique job name - must be implemented by subclasses */
  abstract readonly name: string;

  /** Optional: Max retries - defaults to 0 */
  readonly maxRetries: number = 0;

  /** Whether to automatically reschedule after completion (override in subclass) */
  public readonly reschedule: boolean = false;
  /** Delay in milliseconds before automatic reschedule (override in subclass) */
  public readonly rescheduleIn?: number;

  /** Optional: Backoff strategy - defaults to 'none' */
  readonly backoffStrategy: BackoffStrategy = "none";

  protected readonly config: GutPunchConfig;
  protected readonly db: JobDb;

  constructor(config: GutPunchConfig, db: JobDb) {
    this.config = config;
    this.db = db;
  }

  /** Run the job logic - must be implemented by subclasses */
  abstract run(params?: Record<string, unknown>): Promise<JobResult>;
}
