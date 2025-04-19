/**
 * GutPunch main entry point and exported class.
 */
import { Scheduler } from "./core/scheduler";

/**
 * GutPunch class for integration.
 */
export class GutPunch {
  private readonly scheduler: Scheduler;

  constructor() {
    this.scheduler = new Scheduler();
  }

  /** Start the scheduler. */
  public async start(): Promise<void> {
    await this.scheduler.start();
  }
}

export default GutPunch;
