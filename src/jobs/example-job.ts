/**
 * Example job implementation for Gut-Punch
 */
import type { Job, JobResult, BackoffStrategy } from "../../index.js";
import { JobRunStatus } from "../../index.js";

/**
 * Example job that demonstrates the Job interface implementation
 */
export class ExampleJob implements Job {
  /** Execute this job inside scheduler process (no subprocess) */
  public static readonly runInProcess: boolean = true;
  
  /** Unique job name */
  public readonly name: string = "ExampleJob";
  
  /** Maximum number of retry attempts */
  public readonly maxRetries: number = 3;
  
  /** Strategy for retry backoff */
  public readonly backoffStrategy: BackoffStrategy = "exponential";
  
  /** Whether to automatically reschedule after completion */
  public readonly reschedule: boolean = true;
  
  /** Delay in milliseconds before automatic reschedule */
  public readonly rescheduleIn: number = 5_000; // 5 seconds

  /**
   * Run the job logic
   * @param params - Optional parameters for the job
   * @returns Promise resolving to a JobResult
   */
  public async run(params?: Record<string, unknown>): Promise<JobResult> {
    const now = new Date().toISOString();
    const message = `ExampleJob ran at ${now}. Params: ${JSON.stringify(params || {})}`;
    console.error(`Job log: ${message}`);
    
    return {
      status: JobRunStatus.Success,
      output: { 
        message: "Example job finished successfully!", 
        receivedParams: params || {} 
      },
    };
  }
}

// Script execution part (when run via 'bun run example-job.ts')
if (import.meta.main) {
  (async (): Promise<void> => {
    let jobParams: Record<string, unknown> | undefined;
    
    // Basic argument parsing for params
    // Example: bun run example-job.ts --params='{"foo":"bar"}'
    const paramsArgIndex = process.argv.indexOf('--params');
    if (paramsArgIndex > -1 && process.argv[paramsArgIndex + 1]) {
      try {
        jobParams = JSON.parse(process.argv[paramsArgIndex + 1]);
      } catch (e) {
        console.error("Failed to parse --params argument as JSON:", e);
      }
    }

    const job = new ExampleJob();
    try {
      const result = await job.run(jobParams);
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
