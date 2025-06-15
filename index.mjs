// src/core/enums.ts
var JobRunStatus;
((JobRunStatus2) => {
  JobRunStatus2[JobRunStatus2["Pending"] = 0] = "Pending";
  JobRunStatus2[JobRunStatus2["Running"] = 1] = "Running";
  JobRunStatus2[JobRunStatus2["Success"] = 2] = "Success";
  JobRunStatus2[JobRunStatus2["Failed"] = 3] = "Failed";
  JobRunStatus2[JobRunStatus2["Retrying"] = 4] = "Retrying";
})(JobRunStatus ||= {});
var QueuePriority;
((QueuePriority2) => {
  QueuePriority2[QueuePriority2["High"] = 0] = "High";
  QueuePriority2[QueuePriority2["Default"] = 1] = "Default";
  QueuePriority2[QueuePriority2["Low"] = 2] = "Low";
})(QueuePriority ||= {});
var JobDefinitionStatus;
((JobDefinitionStatus2) => {
  JobDefinitionStatus2[JobDefinitionStatus2["Pending"] = 0] = "Pending";
  JobDefinitionStatus2[JobDefinitionStatus2["Active"] = 1] = "Active";
  JobDefinitionStatus2[JobDefinitionStatus2["Disabled"] = 2] = "Disabled";
})(JobDefinitionStatus ||= {});
export {
  QueuePriority,
  JobRunStatus,
  JobDefinitionStatus
};
