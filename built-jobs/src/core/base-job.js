"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseJob = void 0;
/**
 * Abstract base class for all jobs.
 * Provides common properties and requires implementation of run and optionally getNextRunDate.
 */
class BaseJob {
    /** Static property to identify GutPunch jobs reliably across modules. */
    static isGutPunchJob = true;
    /** Optional: Max retries - defaults to 0 */
    maxRetries = 0;
    /** Optional: Backoff strategy - defaults to 'none' */
    backoffStrategy = "none";
    config;
    db;
    constructor(config, db) {
        this.config = config;
        this.db = db;
    }
    /**
     * Optional: Get the next run time as a Date.
     * Return null if the job should not be scheduled again.
     * Base implementation returns null (job runs only once or is triggered manually).
     */
    getNextRunDate() {
        return null;
    }
}
exports.BaseJob = BaseJob;
//# sourceMappingURL=base-job.js.map