/**
 * Priority queue implementation for Gut Punch.
 */
import type { BaseJob } from "./base-job.js"; // Use BaseJob for consistency

/**
 * Queue item structure.
 */
export interface QueueItem {
  job: BaseJob; // Use BaseJob
  priority: number;
  runId: number; // Add runId
}

/**
 * PriorityQueue class for Gut Punch.
 */
export class PriorityQueue {
  private readonly items: QueueItem[] = [];

  /** Add a job to the queue. */
  public enqueue(job: BaseJob, runId: number, priority: number): void { // Update signature
    const item: QueueItem = { job, runId, priority }; // Create item with all data
    this.items.push(item);
    this.items.sort((a, b) => a.priority - b.priority); // Sort ascending (lower value = higher priority)
  }

  /** Remove and return the highest priority job. */
  public dequeue(): QueueItem | undefined {
    return this.items.shift();
  }

  /** Get the number of jobs in the queue. */
  public size(): number {
    return this.items.length;
  }
}
