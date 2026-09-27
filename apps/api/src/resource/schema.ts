import { z } from "../openapi";

export const RESOURCE_STATUSES = [
	"operational",
	"maintenance",
	"out_of_service",
] as const;

export const workspaceParam = z.object({ workspaceId: z.string() });
export const resourceParam = z.object({ id: z.string() });
export const taskParam = z.object({ taskId: z.string() });
export const memberParam = z.object({
	workspaceId: z.string(),
	userId: z.string(),
});

const resourceFields = {
	name: z.string().trim().min(1).max(160),
	type: z.string().trim().min(1).max(160),
	description: z.string().trim().max(2_000).nullable().optional(),
	status: z.enum(RESOURCE_STATUSES),
	maintenanceStart: z.string().datetime().nullable().optional(),
	maintenanceEnd: z.string().datetime().nullable().optional(),
};

export const createResourceBody = z.object({
	workspaceId: z.string(),
	...resourceFields,
});

export const updateResourceBody = z.object(resourceFields);

export const setTaskResourcesBody = z.object({
	resourceIds: z.array(z.string()).max(50),
});

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const setMemberUnavailabilityBody = z.object({
	dates: z.array(calendarDate).max(366),
});
