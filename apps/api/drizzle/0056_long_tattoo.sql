CREATE TABLE "member_unavailability" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"unavailable_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_unavailability_workspace_user_date_unique" UNIQUE("workspace_id","user_id","unavailable_date")
);
--> statement-breakpoint
ALTER TABLE "member_unavailability" ADD CONSTRAINT "member_unavailability_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "member_unavailability" ADD CONSTRAINT "member_unavailability_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "member_unavailability_workspace_date_idx" ON "member_unavailability" USING btree ("workspace_id","unavailable_date");--> statement-breakpoint
CREATE INDEX "member_unavailability_user_id_idx" ON "member_unavailability" USING btree ("user_id");