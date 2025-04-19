"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelloWorldJob = void 0;
const types_1 = require("../core/types");
const base_job_1 = require("../core/base-job");
/**
 * HelloWorldJob: prints "Hello World" 10 times.
 */
class HelloWorldJob extends base_job_1.BaseJob {
    name = "HelloWorldJob";
    maxRetries = 0;
    backoffStrategy = "none";
    constructor(config, db) {
        super(config, db);
    }
    /**
     * Schedule to run immediately.
     */
    getNextRunDate() {
        return new Date();
    }
    /**
     * Print "Hello World" 10 times.
     */
    async run() {
        for (let i = 0; i < 10; i++) {
            console.log("Hello World");
        }
        return { status: types_1.JobStatus.Success };
    }
}
exports.HelloWorldJob = HelloWorldJob;
//# sourceMappingURL=hello-world-job.js.map