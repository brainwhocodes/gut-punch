/**
 * Example job class for Gut Punch.
 */
import type { JobResult, BackoffStrategy } from "../core/types";
import { JobRunStatus } from "../core/types";
import { BaseJob } from "../core/base-job";
import { GutPunchConfig } from "../config/index";
import { JobDb } from "../db/drizzle";

/**
 * ExampleJob: Prints a message on schedule.
 */
export class ExampleJob extends BaseJob {
  public readonly name: string = "ExampleJob";
  public readonly maxRetries: number = 3;
  public readonly backoffStrategy: BackoffStrategy = "exponential";
  /** Automatically reschedule every hour */
  public readonly reschedule: boolean = true;
  /** Delay before rescheduling (ms) */
  public readonly rescheduleIn: number = 1000 * 3;

  constructor(config: GutPunchConfig, db: JobDb) {
    super(config, db);
  }

  public async run(): Promise<JobResult> {
    const now = new Date().toISOString();
    const message = `ExampleJob ran at ${now}`;
    console.log(message);
    return {
      status: JobRunStatus.Success,
      output: { message: "Example job finished successfully!" },
    };
  }
}
