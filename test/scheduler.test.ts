/**
 * Scheduler integration tests for Gut Punch.
 */
/**
 * Integration tests for the Gut Punch Scheduler.
 * Ensures jobs are built, loaded, and run, and job_runs are persisted.
 */
import { GutPunch } from "../src";
import { existsSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import Database from "better-sqlite3";
import { execSync } from "child_process";

type JobRunCountRow = { count: number };

import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("Scheduler", () => {
  const dbFile = "./test/gut-punch-test.sqlite";
  const configFile = "./config.test.yaml";
  let gutPunch: GutPunch;

  /**
   * Before each test, ensure the DB file is created and schema is initialized using only public APIs.
   */
  beforeEach(async () => {
    if (existsSync(dbFile)) unlinkSync(dbFile);
    writeFileSync(
      configFile,
      `database:\n  file: ${dbFile}\njobsDirectory: dist/jobs\nqueues:\n  default:\n    priority: 1\n  critical:\n    priority: 10\n`
    );
    // Run vite build first if jobs need compiling
    execSync("pnpm run build", { stdio: "inherit" });
    process.env.GUT_PUNCH_CONFIG = configFile;

    // Prepare the database using drizzle-kit push
    execSync(`pnpm run db:push:test`, { stdio: "inherit" });

    // No need to wait for file or check tables, drizzle-kit handles it.
  });

  afterEach(() => {
    if (existsSync(dbFile)) unlinkSync(dbFile);
    if (existsSync(configFile)) unlinkSync(configFile);
  });


  /**
   * Starts the scheduler and verifies at least one job run is persisted as successful.
   */
  it("should load jobs and schedule them", async () => {
    process.env.GUT_PUNCH_CONFIG = configFile;
    // Instantiate GutPunch here, as DB is ready
    gutPunch = new GutPunch();
    // Call start() to load jobs and begin scheduling
    await gutPunch.start();
    // Wait for jobs to run
    await new Promise(res => setTimeout(res, 2500));
    // Wait for the DB file to exist (max 2s extra)
    const waitForFile = async (file: string, timeoutMs: number = 2000) => {
      const start = Date.now();
      while (!existsSync(file)) {
        if (Date.now() - start > timeoutMs) throw new Error(`DB file not created: ${file}`);
        await new Promise(res => setTimeout(res, 100));
      }
    };
    await waitForFile(dbFile);
    // Check the job_runs table for at least one successful run
    const db = new Database(dbFile, { readonly: true });
    const row: JobRunCountRow = db.prepare("SELECT COUNT(*) as count FROM job_runs WHERE status = 'success'").get() as JobRunCountRow;
    db.close();
    expect(row.count).toBeGreaterThan(0);
  });
});
