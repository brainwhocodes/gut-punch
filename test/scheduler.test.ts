/**
 * Scheduler integration tests for Gut Punch.
 */
/**
 * Integration tests for the Gut Punch Scheduler.
 * Ensures jobs are built, loaded, and run, and job_runs are persisted.
 */
import { GutPunch } from "../src";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve as pathResolve } from "node:path"; // Added for absolute path
import { join } from "path";
import { Database } from "bun:sqlite"; // Use bun:sqlite for direct DB access in test
import { stringify as stringifyYaml } from "yaml"; // Corrected YAML import
import { JobRunStatus } from "../src/core/enums.ts"; // Import JobRunStatus
import { runMigrations } from "../src/db/drizzle.ts";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "../src/db/schema.ts";


type JobRunCountRow = { count: number };

import { describe, it, expect, beforeEach, afterEach, test, beforeAll, afterAll } from "bun:test"; // Using bun:test

describe("Scheduler", () => {
  const dbFile = "./test/gut-punch-test.sqlite";
  const relativeConfigFile = "./test/gut-punch.test.config.yaml"; // Test-specific config
  const configFile = pathResolve(relativeConfigFile); // Absolute path
  let gutPunch: GutPunch | undefined;

  /**
   * Before each test, ensure the DB file is created and schema is initialized using only public APIs.
   */
  beforeEach(async () => {
    if (existsSync(dbFile)) unlinkSync(dbFile);
    console.log(`[Test Setup] Writing test config to absolute path: ${configFile}`);
    const testConfig = {
      database: {
        file: dbFile,
        mode: "standalone" // Ensure database mode is set for tests
      },
      jobsDirectory: 'dist/jobs',
      queues: {
        default: {
          priority: 1
        },
        critical: {
          priority: 10
        }
      }
    };
    writeFileSync(configFile, stringifyYaml(testConfig));
    console.log(`[Test Setup] Config file ${configFile} exists: ${existsSync(configFile)}`);
    process.env.GUT_PUNCH_CONFIG = configFile;
    console.log(`[Test Setup] GUT_PUNCH_CONFIG set to: ${process.env.GUT_PUNCH_CONFIG}`);

    // Run vite build first if jobs need compiling
    console.log("[Test Setup] Running build...");
    const buildResult = Bun.spawnSync(["bun", "run", "build"], { stdio: ["inherit", "inherit", "inherit"] as any });
    if (buildResult.exitCode !== 0) {
      throw new Error('Test setup: bun run build failed');
    }
    console.log("[Test Setup] Build completed.");

    // Programmatically run migrations
    console.log(`[Test Setup] Preparing test database: ${dbFile}`);
    const sqlite = new Database(dbFile); // Create it if it doesn't exist
    const dbInstance = drizzle(sqlite, { schema });
    try {
      await runMigrations(dbInstance, './test/migrations');
      console.log("[Test Setup] Programmatic migrations completed.");
    } catch (e) {
      console.error("[Test Setup] Programmatic migrations failed:", e);
      sqlite.close(); // Ensure connection is closed on error
      throw e; // Re-throw to fail the test
    }
    sqlite.close(); // Close connection, Scheduler will open its own
    console.log("[Test Setup] Test database prepared.");
  });

  afterEach(async () => {
    if (gutPunch) {
      await gutPunch.stop(); // Ensure GutPunch is stopped before deleting DB
      gutPunch = undefined; // Reset gutPunch instance
      console.log("[Test Cleanup] gutPunch instance stopped and reset.");
      await Bun.sleep(100); // Add a small delay to help release file locks
    }
    if (existsSync(dbFile)) {
      try {
        unlinkSync(dbFile);
        console.log(`[Test Cleanup] Deleted DB file: ${dbFile}`);
      } catch (err: any) {
        console.error(`[Test Cleanup] Error deleting DB file ${dbFile}: ${err.message}`);
      }
    }
    if (existsSync(configFile)) {
      try {
        unlinkSync(configFile);
        console.log(`[Test Cleanup] Deleted config file: ${configFile}`);
      } catch (err: any) {
        console.error(`[Test Cleanup] Error deleting config file ${configFile}: ${err.message}`);
      }
    }
    // Clean up environment variable if set by test
    if (process.env.GUT_PUNCH_CONFIG === configFile) {
      delete process.env.GUT_PUNCH_CONFIG;
      console.log("[Test Cleanup] Cleared GUT_PUNCH_CONFIG environment variable.");
    }
  });


  /**
   * Starts the scheduler and verifies at least one job run is persisted as successful.
   */
  it("should load jobs and schedule them", async () => {
    console.log("[Test] Starting 'should load jobs and schedule them'");
    try {
    // process.env.GUT_PUNCH_CONFIG is already set in beforeEach
    // Instantiate GutPunch here, as DB is ready
    console.log(`[Test] Current GUT_PUNCH_CONFIG before new GutPunch(): ${process.env.GUT_PUNCH_CONFIG}`);
    console.log("[Test] Instantiating GutPunch...");
    gutPunch = new GutPunch();
    console.log("[Test] GutPunch instantiated successfully.");
    // Call start() to load jobs and begin scheduling
    console.log("[Test] Calling gutPunch.start()...");
    await gutPunch.start();
    console.log("[Test] gutPunch.start() completed.");
    // Wait for jobs to run
    console.log("[Test] Waiting for jobs to run (2500ms)...");
    await new Promise(res => setTimeout(res, 2500));
    console.log("[Test] Wait finished.");
    // Wait for the DB file to exist (max 2s extra)
    const waitForFile = async (file: string, timeoutMs: number = 2000) => {
      console.log(`[Test] Waiting for DB file: ${file}`);
      const start = Date.now();
      while (!existsSync(file)) {
        if (Date.now() - start > timeoutMs) {
          console.error(`[Test] DB file not created within timeout: ${file}`);
          throw new Error(`DB file not created: ${file}`);
        }
        await new Promise(res => setTimeout(res, 100));
      }
    };
    await waitForFile(dbFile);
    console.log(`[Test] DB file found: ${dbFile}`); // Corrected variable and placement
    // Check the job_runs table for at least one successful run
    console.log("[Test] Connecting to DB to check job_runs...");
    const db = new Database(dbFile, { readonly: true });
    console.log("[Test] DB connected. Preparing statement...");
    const row: JobRunCountRow = db.query(`SELECT COUNT(*) as count FROM job_runs WHERE status = ${JobRunStatus.Success}`).get() as JobRunCountRow;
    console.log("[Test] Statement executed. Row count:", row.count);
    db.close();
    console.log("[Test] DB closed.");
    expect(row.count).toBeGreaterThan(0);
    console.log("[Test] Assertion passed.");
    } // Closes the try block
    catch (error) {
      console.error("[Test] Error during test execution:", error);
      throw error; // Re-throw to ensure test fails
    }
  }); // Closes the it(...) block
});
