import type { JobResult, BackoffStrategy } from "../core/types";
import { JobStatus } from "../core/types";
import { BaseJob } from "../core/base-job";
import { GutPunchConfig } from "../config";
import { JobDb } from "../db/drizzle";

/**
 * HelloWorldJob: prints "Hello World" 10 times.
 */
export class HelloWorldJob extends BaseJob {
  public readonly name = "HelloWorldJob";
  public readonly maxRetries = 0;
  public readonly backoffStrategy: BackoffStrategy = "none";
  /** Does not reschedule by default */
  public readonly reschedule: boolean = false;

  constructor(config: GutPunchConfig, db: JobDb) {
    super(config, db);
  }

  /**
   * Print "Hello World" 10 times.
   */
  public async run(): Promise<JobResult> {
    const messages: string[] = [];
    for (let i = 0; i < 10; i++) {
      const msg = `Hello World ${i + 1}`;
      console.log(msg);
      messages.push(msg);
    }
    return { status: JobStatus.Success, output: messages };
  }
}
