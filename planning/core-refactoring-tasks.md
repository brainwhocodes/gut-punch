# Core Refactoring Tasks

This document outlines tasks for refactoring core components, including the `Scheduler`, for improved code quality, clarity, and maintainability.

## Requirements

- Improve code readability and type safety.
- Replace magic strings/constants with enums.
- Simplify complex logic where possible.
- Adhere to user-defined coding standards (e.g., function length, typing).

## Tasks

### 5. Enum Implementation

- [ ] Define TypeScript enums for `JobRunStatus` (e.g., `Pending`, `Running`, `Success`, `Failed`, `Retrying`).
- [ ] Define TypeScript enums for `QueuePriority` (e.g., `High`, `Default`, `Low`).
- [ ] Replace the constant objects (`JOB_RUN_STATUS`, `QUEUE_PRIORITIES`) in `scheduler.ts` and other relevant files with the new enums.
- [ ] Ensure database interactions correctly handle enum values (e.g., storing string representations).

### 6. Scheduler Simplification

- [ ] Refactor `Scheduler.loadJobs` method:
  - Break down the logic into smaller, single-purpose helper functions (e.g., `findJobFiles`, `importJobModule`, `registerJobInstance`).
  - Improve error handling for file system operations and module imports.
  - Reduce complexity and nesting.
- [ ] Refactor `Scheduler.runNextJob` method:
  - Simplify the job execution and rescheduling logic.
  - Improve error handling and logging for job failures.
  - Extract complex parts into helper functions if needed.
- [ ] Review `Scheduler.pollAndEnqueueJobs` for potential simplification and clarity improvements.
- [ ] Eliminate type assertions like `(scheduler as any)` by improving internal type management or refactoring access patterns.

### 7. Code Quality Improvements

- [ ] Review all core components (`Scheduler`, `PriorityQueue`, `BaseJob`, etc.) against user-defined rules (e.g., function length < 20 lines, type declarations, avoiding `any`).
- [ ] Add JSDoc comments to public methods and classes where missing.
- [ ] Identify and refactor any deeply nested blocks using early returns or helper functions.
- [ ] Ensure consistent error handling patterns.

### 8. Testing

- [ ] Update existing unit tests to reflect refactoring changes (e.g., using enums).
- [ ] Add new unit tests for any extracted helper functions.
- [ ] Ensure test coverage remains high for core components.

## Completion Criteria

- Enums are used consistently for statuses and priorities.
- Complex methods in `Scheduler` are simplified and easier to understand.
- Code adheres to user-defined styling and quality rules.
- Type safety is maintained or improved.
- All unit tests pass and coverage is adequate.
