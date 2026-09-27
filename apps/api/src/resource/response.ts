import { nullableResponseTimestamp, responseTimestamp, z } from "../openapi";
import { RESOURCE_STATUSES } from "./schema";

export const resourceSchema = z
	.object({
		id: z.string(),
		workspaceId: z.string(),
		name: z.string(),
		type: z.string(),
		description: z.string().nullable(),
		status: z.enum(RESOURCE_STATUSES),
		maintenanceStart: nullableResponseTimestamp,
		maintenanceEnd: nullableResponseTimestamp,
		createdAt: responseTimestamp,
		updatedAt: responseTimestamp,
	})
	.openapi("Resource");

export const resourceListSchema = z.array(resourceSchema);

export const memberUnavailabilitySchema = z
	.object({
		id: z.string(),
		workspaceId: z.string(),
		userId: z.string(),
		unavailableDate: z.string(),
		createdAt: responseTimestamp,
	})
	.openapi("MemberUnavailability");

export const memberUnavailabilityListSchema = z.array(
	memberUnavailabilitySchema,
);

const conflictTaskSchema = z.object({
	id: z.string(),
	title: z.string(),
	number: z.number().nullable(),
	projectId: z.string(),
	projectName: z.string(),
	assigneeId: z.string().nullable(),
	assigneeName: z.string().nullable(),
	startDate: nullableResponseTimestamp,
	dueDate: nullableResponseTimestamp,
});

export const resourceConflictSchema = z
	.object({
		kind: z.enum([
			"resource",
			"assignee",
			"maintenance",
			"unavailable",
			"member_unavailable",
		]),
		resourceId: z.string().nullable(),
		resourceName: z.string().nullable(),
		assigneeId: z.string().nullable(),
		assigneeName: z.string().nullable(),
		unavailableDate: z.string().nullable(),
		task: conflictTaskSchema,
		conflictingTask: conflictTaskSchema.nullable(),
	})
	.openapi("ResourceConflict");

export const resourceConflictListSchema = z.array(resourceConflictSchema);
