"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExampleJob = void 0;
const types_1 = require("../core/types");
const base_job_1 = require("../core/base-job");
/**
 * ExampleJob: Prints a message on schedule.
 */
class ExampleJob extends base_job_1.BaseJob {
    name = "ExampleJob";
    maxRetries = 3;
    backoffStrategy = "exponential";
    constructor(config, db) {
        super(config, db);
    }
    /**
     * Schedule to run at a specific time (e.g., next top of the hour)
     */
    getNextRunDate() {
        const now = new Date();
        const next = new Date(now);
        next.setHours(now.getHours() + 1, 0, 0, 0); // next top of the hour
        return next;
    }
    async run() {
        console.log("ExampleJob is running!");
        return { status: types_1.JobStatus.Success };
    }
}
exports.ExampleJob = ExampleJob;
//# sourceMappingURL=example-job.js.map