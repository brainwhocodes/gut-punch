#!/usr/bin/env node
/**
 * GutPunch CLI
 * Provides commands to list jobs, queues, upcoming jobs, and run the scheduler as a process.
 *
 * @packageDocumentation
 */
import { GutPunch } from "./index";
import { Scheduler } from "./core/scheduler";
import { Job } from "./core/types";
import { PriorityQueue } from "./core/queue";
import * as readline from "readline";

/**
 * CLI entry point.
 */
async function main(): Promise<void> {
  const args: string[] = process.argv.slice(2);
  const scheduler: Scheduler = new Scheduler();
  await scheduler["ensureSchema"]();
  await scheduler["loadJobs"]();

  if (args.length === 0 || args[0] === "help") {
    printHelp();
    return;
  }

  switch (args[0]) {
    case "list-jobs":
      await listJobs(scheduler);
      break;
    case "list-queues":
      await listQueues(scheduler);
      break;
    case "upcoming":
      await listUpcoming(scheduler);
      break;
    case "run":
      await runScheduler();
      break;
    default:
      console.error(`Unknown command: ${args[0]}`);
      printHelp();
      process.exit(1);
  }
}

/**
 * Print help message.
 */
function printHelp(): void {
  console.log(`GutPunch CLI Usage:\n` +
    `  list-jobs      List all loaded jobs\n` +
    `  list-queues    List all queues and their job counts\n` +
    `  upcoming       List upcoming jobs (next run date)\n` +
    `  run            Run the scheduler as a process\n` +
    `  help           Show this help message\n`
  );
}

/**
 * List all loaded jobs.
 */
async function listJobs(scheduler: Scheduler): Promise<void> {
  const jobsDict: Record<string, Job> = (scheduler as any).jobs;
  const jobNames = Object.keys(jobsDict);
  if (jobNames.length === 0) {
    console.log("No jobs loaded.");
    return;
  }
  console.log("\n--- Loaded Jobs ---");
  for (const name of jobNames) {
    console.log(`- ${name}`);
  }
}

/**
 * List all queues and their job counts.
 */
async function listQueues(scheduler: Scheduler): Promise<void> {
  const queues: Record<string, PriorityQueue> = (scheduler as any).queues;
  console.log("Queues:");
  for (const [name, queue] of Object.entries(queues)) {
    console.log(`- ${name}: ${queue.size()} jobs`);
  }
}

/**
 * List upcoming jobs and their next run date.
 */
async function listUpcoming(scheduler: Scheduler): Promise<void> {
  const db = (scheduler as any).db;
  const rows = await db.getAllScheduledJobs();
  if (rows.length === 0) {
    console.log("No scheduled jobs found.");
    return;
  }
  console.log("\n--- Upcoming Jobs ---");
  for (const { job_name, next_run } of rows) {
    console.log(`- ${job_name}: next at ${next_run}`);
  }
}

/**
 * Run the scheduler as a process (blocks and runs jobs).
 */
async function runScheduler(): Promise<void> {
  const gutPunch: GutPunch = new GutPunch();
  await gutPunch.start();
  console.log("GutPunch scheduler started. Press Ctrl+C to exit.");
  // Keep process alive
  readline.createInterface({ input: process.stdin, output: process.stdout });
}

main().catch((err) => {
  console.error("CLI Error:", err);
  process.exit(1);
});
