/**
 * Shared types and interfaces for Gut Punch scheduler
 */

/**
 * Job status enumeration.
 */
export enum JobRunStatus {
  Pending = "pending",
  Running = "running",
  Success = "success",
  Failed = "failed",
  Retrying = "retrying"
}

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
  output?: unknown;
  error?: string;
}

/**
 * Backoff strategy type.
 */
export type BackoffStrategy = "exponential" | "linear" | "none";

/**
 * Represents the persistent status of a job definition in the database.
 */
export type JobStatus = "pending" | "active" | "disabled";
