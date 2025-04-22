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
   * Construct a GutPunch scheduler with optional config path.
   * @param {string} configPath - Path to YAML config file
   */
  constructor(configPath: string = "config.yaml") {
    this.scheduler = new Scheduler(configPath);
  }

  /** Start the scheduler. */
  public async start(): Promise<void> {
    await this.scheduler.start();
  }
}

export { Scheduler } from "./core/scheduler.js";
