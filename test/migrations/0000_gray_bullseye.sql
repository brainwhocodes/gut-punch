CREATE TABLE `job_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_name` text NOT NULL,
	`queue_name` text NOT NULL,
	`priority` integer NOT NULL,
	`status` integer NOT NULL,
	`started_at` text,
	`finished_at` text,
	`output` text,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY NOT NULL,
	`job_name` text NOT NULL,
	`status` integer DEFAULT 0 NOT NULL,
	`reschedule` integer DEFAULT false NOT NULL,
	`reschedule_in` integer,
	`last_run_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_job_name_unique` ON `jobs` (`job_name`);--> statement-breakpoint
CREATE TABLE `scheduled_jobs` (
	`job_name` text PRIMARY KEY NOT NULL,
	`next_run` text NOT NULL
);
