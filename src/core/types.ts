/**
 * Shared types and interfaces for Gut Punch scheduler
 */

import { JobRunStatus } from "./enums"; // Import the correct enum
export { JobRunStatus }; // Re-export JobRunStatus

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
