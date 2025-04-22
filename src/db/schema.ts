import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const jobRuns = sqliteTable("job_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  job_name: text("job_name").notNull(),
  queue_name: text("queue_name").notNull(),
  priority: integer("priority").notNull(),
  status: text("status").notNull(),
  started_at: text("started_at"),
  finished_at: text("finished_at"),
  output: text("output"),
  error: text("error"),
});

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey(),
  job_name: text("job_name").notNull().unique(),
  status: text("status", { enum: ["pending", "active", "disabled"] }).notNull().default("pending"), // Add status column
  reschedule: integer("reschedule", { mode: "boolean" }).notNull().default(false),
  reschedule_in: integer("reschedule_in"), // Milliseconds, nullable
  last_run_at: integer("last_run_at", { mode: "timestamp_ms" }),
});

export const scheduledJobs = sqliteTable("scheduled_jobs", {
  job_name: text("job_name").primaryKey(),
  next_run: text("next_run").notNull(),
});