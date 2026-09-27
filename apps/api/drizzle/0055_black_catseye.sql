CREATE TABLE "resource" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'operational' NOT NULL,
	"maintenance_start" timestamp,
	"maintenance_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "resource_workspace_name_unique" UNIQUE("workspace_id","name")
);
--> statement-breakpoint
CREATE TABLE "task_resource" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_resource_task_resource_unique" UNIQUE("task_id","resource_id")
);
--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_resource" ADD CONSTRAINT "task_resource_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_resource" ADD CONSTRAINT "task_resource_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "resource_workspace_id_idx" ON "resource" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "resource_workspace_status_idx" ON "resource" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "task_resource_task_id_idx" ON "task_resource" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_resource_resource_id_idx" ON "task_resource" USING btree ("resource_id");