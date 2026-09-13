ALTER TABLE `card_keys` ADD `created_by` integer REFERENCES users(id);
--> statement-breakpoint
ALTER TABLE `card_keys` ADD `activated_by` integer REFERENCES users(id);
