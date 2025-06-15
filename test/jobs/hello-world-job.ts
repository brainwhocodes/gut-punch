import type { JobResult, BackoffStrategy, Job } from "../../src/core/types";
import { JobRunStatus } from "../../src/core/enums";

/**
 * HelloWorldJob: prints "Hello World" 10 times.
 */
export class HelloWorldJob implements Job {
  public readonly name: string = "HelloWorldJob";
  public readonly maxRetries: number = 0;
  public readonly backoffStrategy: BackoffStrategy = "none";
  /** Does not reschedule by default */
  public readonly reschedule: boolean = false;

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
    return { status: JobRunStatus.Success, output: messages };
  }
}
