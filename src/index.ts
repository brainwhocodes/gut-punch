/**
 * GutPunch main entry point and exported class.
 */
import { Scheduler } from "./core/scheduler.js";

/**
 * GutPunch class for integration.
 */
export class GutPunch {
  private readonly scheduler: Scheduler;

  /**
   * Construct a GutPunch scheduler with optional config directory.
   * @param {string} configDir - Directory containing YAML config file
   */
  constructor(configDir: string = ".") {
    this.scheduler = new Scheduler(configDir);
  }

  /** Start the scheduler. */
  public async start(): Promise<void> {
    await this.scheduler.start();
  }
}

export { Scheduler } from "./core/scheduler.js";
