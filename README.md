# Gut Punch

A class-first, modular job scheduler for Node.js (TypeScript).

## Features

- Define jobs as classes extending `BaseJob`, with built-in status tracking and automatic rescheduling via `reschedule` & `rescheduleIn` flags.
- YAML-based global configuration (`config.yaml`).
- Persistent job definitions and runs using Drizzle ORM + SQLite.
- Priority queues, retry/backoff strategies, and customizable rescheduling.
- CLI tools to list jobs, queues, upcoming schedules, or run the scheduler.

## Prerequisites

- Node.js >= 18
- pnpm (or npm)
- SQLite (via `better-sqlite3`)

## Installation

```bash
git clone <repository-url>
cd gut-punch
pnpm install
```

## Configuration

Edit `config.yaml` to set database file, jobs path, and queue priorities:

```yaml
database:
  file: ./jobs.db
jobsDirectory: src/jobs
queues:
  default:
    priority: 1
  high:
    priority: 0
  low:
    priority: 2
```

## Database Migrations

Generate and apply migrations for the updated schema:

```bash
pnpm run db:generate
pnpm run db:migrate
```

## Defining Jobs

Create classes in `src/jobs/` that extend `BaseJob`:

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

Run locally in development:

```bash
pnpm run dev
```

Use the CLI commands:

```bash
npx ts-node src/cli.ts list-jobs     # Show loaded job definitions
npx ts-node src/cli.ts list-queues   # Show current queue counts
npx ts-node src/cli.ts upcoming      # List upcoming scheduled jobs
npx ts-node src/cli.ts run           # Start scheduler (blocks)
```

## Production

Build and start:

```bash
pnpm run build
pnpm start
```

## Contributing

1. Fork the repo
2. Create a feature branch
3. Open a PR

## License

MIT

---
*Generated on 2025-04-19*