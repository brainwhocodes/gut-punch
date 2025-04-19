"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledJobs = exports.jobs = exports.jobRuns = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
exports.jobRuns = (0, sqlite_core_1.sqliteTable)("job_runs", {
    id: (0, sqlite_core_1.integer)("id").primaryKey({ autoIncrement: true }),
    job_name: (0, sqlite_core_1.text)("job_name").notNull(),
    queue_name: (0, sqlite_core_1.text)("queue_name").notNull(),
    priority: (0, sqlite_core_1.integer)("priority").notNull(),
    status: (0, sqlite_core_1.text)("status").notNull(),
    started_at: (0, sqlite_core_1.text)("started_at"),
    finished_at: (0, sqlite_core_1.text)("finished_at"),
    output: (0, sqlite_core_1.text)("output"),
    error: (0, sqlite_core_1.text)("error"),
});
exports.jobs = (0, sqlite_core_1.sqliteTable)("jobs", {
    job_name: (0, sqlite_core_1.text)("job_name").primaryKey(),
});
exports.scheduledJobs = (0, sqlite_core_1.sqliteTable)("scheduled_jobs", {
    job_name: (0, sqlite_core_1.text)("job_name").primaryKey(),
    next_run: (0, sqlite_core_1.text)("next_run").notNull(),
});
//# sourceMappingURL=schema.js.map