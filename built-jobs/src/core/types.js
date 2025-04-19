"use strict";
/**
 * Shared types and interfaces for Gut Punch scheduler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobStatus = void 0;
/**
 * Job status enumeration.
 */
var JobStatus;
(function (JobStatus) {
    JobStatus["Pending"] = "pending";
    JobStatus["Running"] = "running";
    JobStatus["Success"] = "success";
    JobStatus["Failed"] = "failed";
    JobStatus["Retrying"] = "retrying";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
//# sourceMappingURL=types.js.map