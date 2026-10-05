CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`login` text PRIMARY KEY NOT NULL,
	`display_login` text NOT NULL,
	`status` text NOT NULL,
	`avatar_url` text,
	`merged_count` integer DEFAULT 0 NOT NULL,
	`window_start` integer NOT NULL,
	`fetched_at` integer NOT NULL,
	`titles` text DEFAULT '[]' NOT NULL,
	`details` text,
	`details_at` integer
);
--> statement-breakpoint
CREATE INDEX `users_merged_count` ON `users` (`status`,`merged_count`);--> statement-breakpoint
CREATE INDEX `users_fetched_at` ON `users` (`status`,`fetched_at`);