/**
 * GutPunch Job Library Type Definitions
 */

/**
 * Job Run Statuses
 */
export declare enum JobRunStatus {
  Pending = 0,
  Running = 1,
  Success = 2,
  Failed = 3,
  Retrying = 4
}

/**
 * Queue Priorities
 */
export declare enum QueuePriority {
  High = 0,
  Default = 1,
  Low = 2
}

/**
 * Job Definition Statuses
 */
export declare enum JobDefinitionStatus {
  Pending = 0,
  Active = 1,
  Disabled = 2
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
  ctor: new () => Job;
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
  /** Optional: Run the job in-process */
  runInProcess?: boolean;
  /** The absolute path to the job's executable TypeScript file. */
  filePath?: string;
  /** The queue this job should run in. Defaults to 'default'. */
  queue?: string;
}
