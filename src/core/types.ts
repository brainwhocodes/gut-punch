/**
 * Shared types and interfaces for Gut Punch scheduler
 */

import { JobRunStatus } from "./enums"; // Import the correct enum

/**
 * Interface for a job class.
 */
export interface Job {
  /** Unique job name */
  readonly name: string;
  /** Whether to automatically reschedule after completion */
  readonly reschedule?: boolean;
  /** Delay in milliseconds before automatic reschedule */
  readonly rescheduleIn?: number;
  /** Run the job logic */
  run(params?: Record<string, unknown>): Promise<JobResult>;
  /** Optional: Max retries */
  readonly maxRetries?: number;
  /** Optional: Backoff strategy */
  readonly backoffStrategy?: BackoffStrategy;
}

/**
 * Result of a job run.
 */
export interface JobResult {
  status: JobRunStatus;
  output?: Record<string, any> | null;
  error?: string | undefined;
}

/**
 * Backoff strategy type.
 */
export type BackoffStrategy = "exponential" | "linear" | "none";

/**
 * Represents the metadata for a job that the scheduler discovers and manages.
 * This is the internal representation of a job within the CLI, containing
 * information needed to execute it.
 */
export interface JobDefinition {
  /** Unique job name */
  readonly name: string;
  /** Constructor of the job class for in-process execution. */
  readonly ctor: new () => Job;
  /** Whether to automatically reschedule after completion */
  readonly reschedule?: boolean;
    /** Delay in milliseconds before automatic reschedule */
  readonly rescheduleIn?: number;
  /** Run the job logic */
  run(params?: Record<string, unknown>): Promise<JobResult>;
  /** Optional: Max retries */
  readonly maxRetries?: number;
  /** Optional: Backoff strategy */
  readonly backoffStrategy?: BackoffStrategy;
  /** The absolute path to the job's executable TypeScript file. */
  filePath?: string;
  /** The queue this job should run in. Defaults to 'default'. */
  queue?: string;
}
