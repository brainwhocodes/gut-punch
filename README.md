# Gut Punch

A class-first, modular job scheduler for TypeScript, supporting both Node.js and Bun runtimes.

## Features

- Define jobs as classes extending `BaseJob`, with built-in status tracking and automatic rescheduling via `reschedule` & `rescheduleIn` flags.
- YAML-based global configuration (`config.yaml`).
- Flexible build process using either Vite or Bun's bundler.
- Output structure: `dist/jobs/` for jobs, `dist/cli.cjs` for CLI.
- Persistent job definitions and runs using Drizzle ORM + SQLite.
- Priority queues, retry/backoff strategies, and customizable rescheduling.
- CLI tools to list jobs, queues, upcoming schedules, or run the scheduler.
- Support for both Node.js and Bun runtimes.

## Prerequisites

- Node.js >= 18 or Bun >= 1.0.0
- SQLite (via `better-sqlite3`)

## Installation

### Using Node.js with pnpm

```bash
git clone <repository-url>
cd gut-punch
pnpm install
```

### Using Bun

```bash
git clone <repository-url>
cd gut-punch
bun install
```

## Build

### Using Node.js with Vite

Build all jobs and CLI with a single command:

```bash
pnpm run build
```

### Using Bun

Build with Bun's bundler:

```bash
bun run build:bun
```

Both methods will output jobs to `dist/jobs/` and the CLI to `dist/cli.cjs`.

## Configuration

Edit `config.yaml` to set the database file, jobs path, and queue priorities. **Note:** After building, jobs are loaded from the `dist/jobs` directory.

```yaml
database:
  file: ./gut-punch.db
jobsDirectory: dist/jobs
queues:
  default:
    priority: 1
  critical:
    priority: 10
```


## Build & Database Migrations

Build all jobs and CLI (output to `dist/`):

```bash
# Using Node.js
pnpm run build

# Using Bun
bun run build:bun
```

Generate and apply migrations for the updated schema:

```bash
# Using Node.js
pnpm run db:generate
pnpm run db:migrate

# Using Bun
bun run db:generate
bun run db:migrate
```

## Defining Jobs

Create classes in `src/jobs/` that extend `BaseJob`. These will be automatically built into `dist/jobs/` and loaded by the scheduler at runtime:

```ts
import { BaseJob } from '../core/base-job';
import { JobStatus } from '../core/types';

export class MyJob extends BaseJob {
  public readonly name = 'MyJob';
  public readonly reschedule = true;
  public readonly rescheduleIn = 1000 * 60 * 30; // 30 minutes

  public async run(): Promise<{ status: JobStatus; output?: unknown }> {
    // Your job logic
    return { status: JobStatus.Success, output: { doneAt: new Date().toISOString() } };
  }
}
```

## CLI Usage

### Run locally in development:

```bash
# Using Node.js
pnpm run dev

# Using Bun
bun run dev:bun
```

### Use the CLI commands:

```bash
# Using Node.js
npx ts-node src/cli.ts list-jobs     # Show loaded job definitions
npx ts-node src/cli.ts list-queues   # Show current queue counts
npx ts-node src/cli.ts upcoming      # List upcoming scheduled jobs
npx ts-node src/cli.ts run           # Start scheduler (blocks)

# Using Bun
bun run src/cli.ts list-jobs         # Show loaded job definitions
bun run src/cli.ts list-queues       # Show current queue counts
bun run src/cli.ts upcoming          # List upcoming scheduled jobs
bun run src/cli.ts run               # Start scheduler (blocks)
```

## Production

Build and start:

```bash
# Using Node.js
pnpm run build
pnpm start

# Using Bun
bun run build:bun
bun start
```

## Contributing

1. Fork the repo
2. Create a feature branch
3. Open a PR

## License

MIT

## Testing

Run tests:

```bash
# Run tests
bun test

# Run tests with coverage
bun test --coverage
```

---
*Updated on 2025-05-31*