"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobDb = void 0;
exports.createDb = createDb;
/**
 * Drizzle ORM setup for SQLite.
 */
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const better_sqlite3_2 = require("drizzle-orm/better-sqlite3");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("./schema");
/**
 * Create and export Drizzle DB instance using better-sqlite3.
 */
function createDb(file) {
    const sqlite = new better_sqlite3_1.default(file);
    return (0, better_sqlite3_2.drizzle)(sqlite);
}
class JobDb {
    db;
    constructor(file) {
        const sqlite = new better_sqlite3_1.default(file);
        this.db = (0, better_sqlite3_2.drizzle)(sqlite);
    }
    /** Insert a new job run. */
    /**
     * Insert a new job run.
     * @param run JobRunRecord
     * @returns id of inserted job run
     */
    async insertJobRun(run) {
        console.log(`[DB] Inserting job run:`, run);
        const result = await this.db.insert(schema_1.jobRuns).values(run);
        // Drizzle returns lastInsertRowid for better-sqlite3
        const rid = result.lastInsertRowid;
        console.log(`[DB] Inserted job run with id:`, rid);
        return typeof rid === 'bigint' ? Number(rid) : rid;
    }
    /** Update job run status and metadata. */
    /**
     * Update job run status and metadata.
     * @param id JobRunRecord id
     * @param updates Partial fields to update
     */
    async updateJobRun(id, updates) {
        console.log(`[DB] Updating job run id ${id} with:`, updates);
        if (Object.keys(updates).length === 0)
            return;
        await this.db.update(schema_1.jobRuns).set(updates).where((0, drizzle_orm_1.eq)(schema_1.jobRuns.id, id));
        console.log(`[DB] Updated job run id ${id}`);
    }
    /** Insert a job definition if it doesn't exist. */
    /**
     * Insert a job definition if it doesn't exist.
     * @param job JobRecord
     */
    async insertJob(job) {
        console.log(`[DB] Inserting job definition:`, job);
        await this.db.insert(schema_1.jobs).values(job).onConflictDoNothing();
        console.log(`[DB] Inserted job definition:`, job.job_name);
    }
    /** Upsert a scheduled job (insert or update next_run). */
    /**
     * Upsert a scheduled job (insert or update next_run).
     * @param job ScheduledJobRecord
     */
    async upsertScheduledJob(job) {
        console.log(`[DB] Upserting scheduled job:`, job);
        await this.db
            .insert(schema_1.scheduledJobs)
            .values(job)
            .onConflictDoUpdate({
            target: schema_1.scheduledJobs.job_name,
            set: { next_run: job.next_run }
        });
        console.log(`[DB] Upserted scheduled job:`, job.job_name, '->', job.next_run);
    }
    /** Get all scheduled jobs due to run. */
    /**
     * Get all scheduled jobs due to run.
     * @param now ISO string for current time
     * @returns Array of ScheduledJobRecord
     */
    async getDueScheduledJobs(now) {
        console.log(`[DB] Querying due scheduled jobs at ${now}`);
        const rows = await this.db
            .select()
            .from(schema_1.scheduledJobs)
            .where((0, drizzle_orm_1.sql) `${schema_1.scheduledJobs.next_run} <= ${now}`);
        return rows.map(row => ({
            job_name: row.job_name,
            next_run: row.next_run,
        }));
    }
    /** Remove a scheduled job (one-time jobs). */
    /**
     * Remove a scheduled job (one-time jobs).
     * @param jobName string
     */
    async removeScheduledJob(jobName) {
        console.log(`[DB] Removing scheduled job: ${jobName}`);
        await this.db.delete(schema_1.scheduledJobs).where((0, drizzle_orm_1.eq)(schema_1.scheduledJobs.job_name, jobName));
        console.log(`[DB] Removed scheduled job: ${jobName}`);
    }
}
exports.JobDb = JobDb;
//# sourceMappingURL=drizzle.js.map