#!/usr/bin/env node
/**
 * GutPunch CLI
 * Provides commands to list jobs, queues, upcoming jobs, and run the scheduler as a process.
 *
 * @packageDocumentation
 */
import { GutPunch, Scheduler } from "./index";
import { Job } from "./core/types";
import { PriorityQueue } from "./core/queue";
import { Command } from "commander";

/**
 * CLI entry point using Commander
 * @returns {Promise<void>} Completion promise
 */
async function main(): Promise<void> {
  console.log("[CLI] Starting main function...");
  const program: Command = new Command();
  program
    .name('gutpunch')
    .description('Class-first, modular job scheduler for Node')
    .version('0.1.0');
  program.option('-c, --config <path>', 'Path to YAML config file', 'config.yaml');
  program
    .command('list-jobs')
    .description('List all loaded jobs')
    .action(() => handleListJobs(program.opts().config));

  program
    .command('list-queues')
    .description('List all queues and their job counts')
    .action(() => handleListQueues(program.opts().config));

  program
    .command('upcoming')
    .description('List upcoming jobs (next run date)')
    .action(() => handleListUpcoming(program.opts().config));

  program
    .command('run')
    .description('Run the scheduler as a process')
    .action(() => handleRunScheduler(program.opts().config));

  await program.parseAsync(process.argv);
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
/**
 * Handler for the 'list-queues' command.
 * @param {string} configPath - Path to YAML config file
 * @returns {Promise<void>} Completion promise
 */
async function handleListQueues(configPath: string): Promise<void> {
  const scheduler: Scheduler = new Scheduler(configPath);
  await scheduler["ensureSchema"]();
  await scheduler["loadJobs"]();
  const queues: Record<string, PriorityQueue> = (scheduler as any).queues;
  console.log("Queues:");
  for (const [name, queue] of Object.entries(queues)) { console.log(`- ${name}: ${queue.size()} jobs`); }
}

/**
 * List upcoming jobs and their next run date.
 */
/**
 * Handler for the 'upcoming' command.
 * @param {string} configPath - Path to YAML config file
 * @returns {Promise<void>} Completion promise
 */
async function handleListUpcoming(configPath: string): Promise<void> {
  const scheduler: Scheduler = new Scheduler(configPath);
  await scheduler["ensureSchema"]();
  await scheduler["loadJobs"]();
  const db = (scheduler as any).db;
  const rows = await db.getDueScheduledJobs(new Date().toISOString());
  if (!rows || rows.length === 0) { console.log("No upcoming jobs."); return; }
  console.log("\n--- Upcoming Jobs ---");
  for (const { job_name, next_run } of rows) { console.log(`- ${job_name}: next at ${next_run}`); }
}

/**
 * Handler for the 'list-jobs' command.
 * @param {string} configPath - Path to YAML config file
 * @returns {Promise<void>} Completion promise
 */
async function handleListJobs(configPath: string): Promise<void> {
  const scheduler: Scheduler = new Scheduler(configPath);
  await scheduler["ensureSchema"]();
  await scheduler["loadJobs"]();
  const jobsDict: Record<string, Job> = (scheduler as any).jobs;
  const jobNames: string[] = Object.keys(jobsDict);
  if (jobNames.length === 0) { console.log("No jobs loaded."); return; }
  console.log("\n--- Loaded Jobs ---");
  for (const name of jobNames) { console.log(`- ${name}`); }
}

/**
 * Run the scheduler as a process (blocks and runs jobs).
 */
/**
 * Handler for the 'run' command.
 * @param {string} configPath - Path to YAML config file
 * @returns {Promise<void>} Completion promise
 */
async function handleRunScheduler(configPath: string): Promise<void> {
  const gutPunch: GutPunch = new GutPunch(configPath);
  await gutPunch.start();
  console.log("GutPunch scheduler started. Press Ctrl+C to exit.");
  // Keep process alive
  process.stdin.resume();
}

main().catch((err) => {
  console.error("[CLI] Unhandled error:", err);
  process.exit(1);
});
