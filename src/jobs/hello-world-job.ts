/**
 * Hello World job implementation for Gut-Punch
 */
import type { Job, JobResult, BackoffStrategy } from "../../index.js";
import { JobRunStatus } from "../../index.js";

/**
 * HelloWorldJob: prints "Hello World" 10 times.
 */
export class HelloWorldJob implements Job {
  /** Execute this job inside scheduler process */
  public static readonly runInProcess: boolean = true;
  
  /** Unique job name */
  public readonly name: string = "HelloWorldJob";
  
  /** No retries for this simple job */
  public readonly maxRetries: number = 0;
  
  /** No backoff strategy needed */
  public readonly backoffStrategy: BackoffStrategy = "none";
  
  /** Does not reschedule by default */
  public readonly reschedule: boolean = false;

  /**
   * Print "Hello World" 10 times.
   * @param params - Optional parameters (not used in this job)
   * @returns Promise resolving to a JobResult with the messages
   */
  public async run(params?: Record<string, unknown>): Promise<JobResult> {
    const messages: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      const msg = `Hello World ${i + 1}`;
      console.log(msg);
      messages.push(msg);
    }
    
    return { 
      status: JobRunStatus.Success, 
      output: { messages } 
    };
  }
}

// Script execution part (when run via 'bun run hello-world-job.ts')
if (import.meta.main) {
  (async (): Promise<void> => {
    const job = new HelloWorldJob();
    try {
      const result = await job.run();
      process.stdout.write(JSON.stringify(result));
      process.exit(0);
    } catch (error) {
      const result: JobResult = {
        status: JobRunStatus.Failed,
        error: error instanceof Error ? error.message : String(error),
      };
      process.stderr.write(JSON.stringify(result));
      process.exit(1);
    }
  })();
}
