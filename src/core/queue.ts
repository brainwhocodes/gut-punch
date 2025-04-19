/**
 * Priority queue implementation for Gut Punch.
 */
import type { Job } from "./types";

/**
 * Queue item structure.
 */
export interface QueueItem {
  job: Job;
  priority: number;
}

/**
 * PriorityQueue class for Gut Punch.
 */
export class PriorityQueue {
  private readonly items: QueueItem[] = [];

  /** Add a job to the queue. */
  public enqueue(item: QueueItem): void {
    this.items.push(item);
    this.items.sort((a, b) => b.priority - a.priority);
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
