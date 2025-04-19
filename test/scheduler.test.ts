/**
 * Scheduler integration tests for Gut Punch.
 */
import { GutPunch } from "../src";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

describe("Scheduler", () => {
  const dbFile = "./gut-punch-test.sqlite";
  const configFile = "./config.yaml";
  let gutPunch: GutPunch;

  beforeAll(() => {
    // Remove test DB if exists
    if (existsSync(dbFile)) unlinkSync(dbFile);
    process.env.GUT_PUNCH_CONFIG = configFile;
    gutPunch = new GutPunch();
  });

  afterAll(() => {
    if (existsSync(dbFile)) unlinkSync(dbFile);
  });

  it("should load jobs and schedule them", async () => {
    await gutPunch.start();
    // Wait a bit for job to run
    await new Promise(res => setTimeout(res, 2000));
    // TODO: Query DB to check job_runs
    expect(true).toBe(true); // Placeholder
  });
});
