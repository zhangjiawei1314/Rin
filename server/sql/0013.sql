CREATE TABLE `card_keys` (
	`id` integer PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `card_keys_code_unique` ON `card_keys` (`code`);--> statement-breakpoint
CREATE INDEX `card_keys_code_idx` ON `card_keys` (`code`);
