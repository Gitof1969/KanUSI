import { and, asc, eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import {
	memberUnavailabilityTable,
	projectTable,
	resourceTable,
	taskResourceTable,
	taskTable,
	userTable,
	workspaceUserTable,
} from "../database/schema";
import type { RESOURCE_STATUSES } from "./schema";

type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

type ResourceInput = {
	name: string;
	type: string;
	description?: string | null;
	status: ResourceStatus;
	maintenanceStart?: string | null;
	maintenanceEnd?: string | null;
};

function parseMaintenance(input: ResourceInput) {
	if (input.status !== "maintenance") {
		return { maintenanceStart: null, maintenanceEnd: null };
	}

	if (!input.maintenanceStart || !input.maintenanceEnd) {
		throw new HTTPException(400, {
			message: "Maintenance start and end dates are required",
		});
	}

	const maintenanceStart = new Date(input.maintenanceStart);
	const maintenanceEnd = new Date(input.maintenanceEnd);
	if (
		Number.isNaN(maintenanceStart.getTime()) ||
		Number.isNaN(maintenanceEnd.getTime()) ||
		maintenanceStart > maintenanceEnd
	) {
		throw new HTTPException(400, {
			message: "Maintenance end date must be on or after its start date",
		});
	}

	return { maintenanceStart, maintenanceEnd };
}

function normalizedResourceValues(input: ResourceInput) {
	return {
		name: input.name.trim(),
		type: input.type.trim(),
		description: input.description?.trim() || null,
		status: input.status,
		...parseMaintenance(input),
	};
}

function isUniqueViolation(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "23505"
	);
}

export async function listResources(workspaceId: string) {
	return db
		.select()
		.from(resourceTable)
		.where(eq(resourceTable.workspaceId, workspaceId))
		.orderBy(asc(resourceTable.type), asc(resourceTable.name));
}

export async function createResource(
	workspaceId: string,
	input: ResourceInput,
) {
	try {
		const [resource] = await db
			.insert(resourceTable)
			.values({ workspaceId, ...normalizedResourceValues(input) })
			.returning();
		if (!resource) {
			throw new HTTPException(500, { message: "Failed to create resource" });
		}
		return resource;
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw new HTTPException(409, {
				message: "A resource with this name already exists",
			});
		}
		throw error;
	}
}

export async function updateResource(id: string, input: ResourceInput) {
	try {
		const [resource] = await db
			.update(resourceTable)
			.set(normalizedResourceValues(input))
			.where(eq(resourceTable.id, id))
			.returning();
		if (!resource) {
			throw new HTTPException(404, { message: "Resource not found" });
		}
		return resource;
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw new HTTPException(409, {
				message: "A resource with this name already exists",
			});
		}
		throw error;
	}
}

export async function deleteResource(id: string) {
	const [resource] = await db
		.delete(resourceTable)
		.where(eq(resourceTable.id, id))
		.returning();
	if (!resource) {
		throw new HTTPException(404, { message: "Resource not found" });
	}
	return resource;
}

export async function listTaskResources(taskId: string) {
	return db
		.select({
			id: resourceTable.id,
			workspaceId: resourceTable.workspaceId,
			name: resourceTable.name,
			type: resourceTable.type,
			description: resourceTable.description,
			status: resourceTable.status,
			maintenanceStart: resourceTable.maintenanceStart,
			maintenanceEnd: resourceTable.maintenanceEnd,
			createdAt: resourceTable.createdAt,
			updatedAt: resourceTable.updatedAt,
		})
		.from(taskResourceTable)
		.innerJoin(
			resourceTable,
			eq(taskResourceTable.resourceId, resourceTable.id),
		)
		.where(eq(taskResourceTable.taskId, taskId))
		.orderBy(asc(resourceTable.type), asc(resourceTable.name));
}

export async function setTaskResources(
	taskId: string,
	workspaceId: string,
	resourceIds: string[],
) {
	const uniqueResourceIds = [...new Set(resourceIds)];
	if (uniqueResourceIds.length) {
		const matching = await db
			.select({ id: resourceTable.id })
			.from(resourceTable)
			.where(
				and(
					eq(resourceTable.workspaceId, workspaceId),
					inArray(resourceTable.id, uniqueResourceIds),
				),
			);
		if (matching.length !== uniqueResourceIds.length) {
			throw new HTTPException(400, {
				message: "Every resource must belong to the task workspace",
			});
		}
	}

	await db.transaction(async (tx) => {
		await tx
			.delete(taskResourceTable)
			.where(eq(taskResourceTable.taskId, taskId));
		if (uniqueResourceIds.length) {
			await tx
				.insert(taskResourceTable)
				.values(
					uniqueResourceIds.map((resourceId) => ({ taskId, resourceId })),
				);
		}
	});

	return listTaskResources(taskId);
}

export async function listMemberUnavailability(workspaceId: string) {
	return db
		.select()
		.from(memberUnavailabilityTable)
		.where(eq(memberUnavailabilityTable.workspaceId, workspaceId))
		.orderBy(
			asc(memberUnavailabilityTable.unavailableDate),
			asc(memberUnavailabilityTable.userId),
		);
}

export async function setMemberUnavailability(
	workspaceId: string,
	userId: string,
	dates: string[],
) {
	const [member] = await db
		.select({ id: workspaceUserTable.id })
		.from(workspaceUserTable)
		.where(
			and(
				eq(workspaceUserTable.workspaceId, workspaceId),
				eq(workspaceUserTable.userId, userId),
			),
		)
		.limit(1);
	if (!member) {
		throw new HTTPException(400, {
			message: "The user is not a member of this workspace",
		});
	}
	for (const date of dates) {
		const parsed = new Date(`${date}T00:00:00.000Z`);
		if (
			Number.isNaN(parsed.getTime()) ||
			parsed.toISOString().slice(0, 10) !== date
		) {
			throw new HTTPException(400, {
				message: `Invalid calendar date: ${date}`,
			});
		}
	}

	const uniqueDates = [...new Set(dates)].sort();
	await db.transaction(async (tx) => {
		await tx
			.delete(memberUnavailabilityTable)
			.where(
				and(
					eq(memberUnavailabilityTable.workspaceId, workspaceId),
					eq(memberUnavailabilityTable.userId, userId),
				),
			);
		if (uniqueDates.length) {
			await tx.insert(memberUnavailabilityTable).values(
				uniqueDates.map((unavailableDate) => ({
					workspaceId,
					userId,
					unavailableDate,
				})),
			);
		}
	});

	return db
		.select()
		.from(memberUnavailabilityTable)
		.where(
			and(
				eq(memberUnavailabilityTable.workspaceId, workspaceId),
				eq(memberUnavailabilityTable.userId, userId),
			),
		)
		.orderBy(asc(memberUnavailabilityTable.unavailableDate));
}

type ScheduledTask = {
	id: string;
	title: string;
	number: number | null;
	projectId: string;
	projectName: string;
	assigneeId: string | null;
	assigneeName: string | null;
	startDate: Date | null;
	dueDate: Date | null;
};

function taskRange(task: ScheduledTask) {
	const first = task.startDate ?? task.dueDate;
	const second = task.dueDate ?? task.startDate;
	if (!first || !second) return null;
	return first <= second
		? { start: first, end: second }
		: { start: second, end: first };
}

function overlaps(
	left: { start: Date; end: Date },
	right: { start: Date; end: Date },
) {
	return left.start <= right.end && right.start <= left.end;
}

function toScheduledTask(task: ScheduledTask): ScheduledTask {
	return {
		id: task.id,
		title: task.title,
		number: task.number,
		projectId: task.projectId,
		projectName: task.projectName,
		assigneeId: task.assigneeId,
		assigneeName: task.assigneeName,
		startDate: task.startDate,
		dueDate: task.dueDate,
	};
}

export async function listResourceConflicts(workspaceId: string) {
	const baseSelection = {
		id: taskTable.id,
		title: taskTable.title,
		number: taskTable.number,
		projectId: taskTable.projectId,
		projectName: projectTable.name,
		assigneeId: taskTable.userId,
		assigneeName: userTable.name,
		startDate: taskTable.startDate,
		dueDate: taskTable.dueDate,
	};

	const tasks = await db
		.select(baseSelection)
		.from(taskTable)
		.innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
		.leftJoin(userTable, eq(taskTable.userId, userTable.id))
		.where(eq(projectTable.workspaceId, workspaceId));

	const assignments = await db
		.select({
			resourceId: resourceTable.id,
			resourceName: resourceTable.name,
			resourceStatus: resourceTable.status,
			maintenanceStart: resourceTable.maintenanceStart,
			maintenanceEnd: resourceTable.maintenanceEnd,
			...baseSelection,
		})
		.from(taskResourceTable)
		.innerJoin(
			resourceTable,
			eq(taskResourceTable.resourceId, resourceTable.id),
		)
		.innerJoin(taskTable, eq(taskResourceTable.taskId, taskTable.id))
		.innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
		.leftJoin(userTable, eq(taskTable.userId, userTable.id))
		.where(eq(resourceTable.workspaceId, workspaceId));

	const conflicts: Array<{
		kind:
			| "resource"
			| "assignee"
			| "maintenance"
			| "unavailable"
			| "member_unavailable";
		resourceId: string | null;
		resourceName: string | null;
		assigneeId: string | null;
		assigneeName: string | null;
		unavailableDate: string | null;
		task: ScheduledTask;
		conflictingTask: ScheduledTask | null;
	}> = [];

	const memberUnavailability = await db
		.select({
			userId: memberUnavailabilityTable.userId,
			unavailableDate: memberUnavailabilityTable.unavailableDate,
		})
		.from(memberUnavailabilityTable)
		.where(eq(memberUnavailabilityTable.workspaceId, workspaceId));
	const unavailableByUser = new Map<string, string[]>();
	for (const entry of memberUnavailability) {
		const dates = unavailableByUser.get(entry.userId) ?? [];
		dates.push(entry.unavailableDate);
		unavailableByUser.set(entry.userId, dates);
	}

	const tasksByAssignee = new Map<string, ScheduledTask[]>();
	for (const task of tasks) {
		if (!task.assigneeId || !taskRange(task)) continue;
		const grouped = tasksByAssignee.get(task.assigneeId) ?? [];
		grouped.push(task);
		tasksByAssignee.set(task.assigneeId, grouped);
	}
	for (const [assigneeId, grouped] of tasksByAssignee) {
		for (let leftIndex = 0; leftIndex < grouped.length; leftIndex += 1) {
			for (
				let rightIndex = leftIndex + 1;
				rightIndex < grouped.length;
				rightIndex += 1
			) {
				const task = grouped[leftIndex];
				const conflictingTask = grouped[rightIndex];
				if (!task || !conflictingTask) continue;
				const leftRange = taskRange(task);
				const rightRange = taskRange(conflictingTask);
				if (!leftRange || !rightRange || !overlaps(leftRange, rightRange)) {
					continue;
				}
				conflicts.push({
					kind: "assignee",
					resourceId: null,
					resourceName: null,
					assigneeId,
					assigneeName: task.assigneeName,
					unavailableDate: null,
					task,
					conflictingTask,
				});
			}
		}
	}

	for (const task of tasks) {
		if (!task.assigneeId) continue;
		const range = taskRange(task);
		if (!range) continue;
		for (const unavailableDate of unavailableByUser.get(task.assigneeId) ??
			[]) {
			const dayRange = {
				start: new Date(`${unavailableDate}T00:00:00.000Z`),
				end: new Date(`${unavailableDate}T23:59:59.999Z`),
			};
			if (!overlaps(range, dayRange)) continue;
			conflicts.push({
				kind: "member_unavailable",
				resourceId: null,
				resourceName: null,
				assigneeId: task.assigneeId,
				assigneeName: task.assigneeName,
				unavailableDate,
				task,
				conflictingTask: null,
			});
		}
	}

	const assignmentsByResource = new Map<string, typeof assignments>();
	for (const assignment of assignments) {
		const grouped = assignmentsByResource.get(assignment.resourceId) ?? [];
		grouped.push(assignment);
		assignmentsByResource.set(assignment.resourceId, grouped);

		const task = toScheduledTask(assignment);
		const range = taskRange(task);
		if (range && assignment.resourceStatus === "out_of_service") {
			conflicts.push({
				kind: "unavailable",
				resourceId: assignment.resourceId,
				resourceName: assignment.resourceName,
				assigneeId: task.assigneeId,
				assigneeName: task.assigneeName,
				unavailableDate: null,
				task,
				conflictingTask: null,
			});
		}
		if (
			range &&
			assignment.resourceStatus === "maintenance" &&
			assignment.maintenanceStart &&
			assignment.maintenanceEnd &&
			overlaps(range, {
				start: assignment.maintenanceStart,
				end: assignment.maintenanceEnd,
			})
		) {
			conflicts.push({
				kind: "maintenance",
				resourceId: assignment.resourceId,
				resourceName: assignment.resourceName,
				assigneeId: task.assigneeId,
				assigneeName: task.assigneeName,
				unavailableDate: null,
				task,
				conflictingTask: null,
			});
		}
	}

	for (const [resourceId, grouped] of assignmentsByResource) {
		for (let leftIndex = 0; leftIndex < grouped.length; leftIndex += 1) {
			for (
				let rightIndex = leftIndex + 1;
				rightIndex < grouped.length;
				rightIndex += 1
			) {
				const left = grouped[leftIndex];
				const right = grouped[rightIndex];
				if (!left || !right) continue;
				const task = toScheduledTask(left);
				const conflictingTask = toScheduledTask(right);
				const leftRange = taskRange(task);
				const rightRange = taskRange(conflictingTask);
				if (!leftRange || !rightRange || !overlaps(leftRange, rightRange)) {
					continue;
				}
				conflicts.push({
					kind: "resource",
					resourceId,
					resourceName: left.resourceName,
					assigneeId: null,
					assigneeName: null,
					unavailableDate: null,
					task,
					conflictingTask,
				});
			}
		}
	}

	return conflicts;
}
