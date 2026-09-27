import { HTTPException } from "hono/http-exception";
import {
  apiRouter,
  type BaseVariables,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import {
  hasWorkspacePermission,
  requireWorkspacePermission,
} from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import {
  memberUnavailabilityListSchema,
  resourceConflictListSchema,
  resourceListSchema,
  resourceSchema,
} from "./response";
import {
  createResourceBody,
  memberParam,
  resourceParam,
  setMemberUnavailabilityBody,
  setTaskResourcesBody,
  taskParam,
  updateResourceBody,
  workspaceParam,
} from "./schema";
import {
  createResource,
  deleteResource,
  listMemberUnavailability,
  listResourceConflicts,
  listResources,
  listTaskResources,
  setMemberUnavailability,
  setTaskResources,
  updateResource,
} from "./service";

const readWorkspaceResourcesRoute = createRoute({
  method: "get",
  operationId: "listWorkspaceResources",
  path: "/workspace/{workspaceId}",
  tags: ["Resources"],
  summary: "List workspace resources",
  middleware: [workspaceAccess.fromParam()] as const,
  request: { params: workspaceParam },
  responses: {
    200: jsonResponse("Workspace resources", resourceListSchema),
    403: errorResponse("No access to the workspace"),
  },
});

const readWorkspaceConflictsRoute = createRoute({
  method: "get",
  operationId: "listWorkspaceResourceConflicts",
  path: "/workspace/{workspaceId}/conflicts",
  tags: ["Resources"],
  summary: "List scheduling conflicts for people and resources",
  middleware: [workspaceAccess.fromParam()] as const,
  request: { params: workspaceParam },
  responses: {
    200: jsonResponse(
      "Workspace scheduling conflicts",
      resourceConflictListSchema,
    ),
    403: errorResponse("No access to the workspace"),
  },
});

const readMemberUnavailabilityRoute = createRoute({
  method: "get",
  operationId: "listWorkspaceMemberUnavailability",
  path: "/workspace/{workspaceId}/unavailability",
  tags: ["Resources"],
  summary: "List workspace member unavailability dates",
  middleware: [workspaceAccess.fromParam()] as const,
  request: { params: workspaceParam },
  responses: {
    200: jsonResponse(
      "Workspace member unavailability dates",
      memberUnavailabilityListSchema,
    ),
    403: errorResponse("No access to the workspace"),
  },
});

const setMemberUnavailabilityRoute = createRoute({
  method: "put",
  operationId: "setWorkspaceMemberUnavailability",
  path: "/workspace/{workspaceId}/member/{userId}/unavailability",
  tags: ["Resources"],
  summary: "Replace a workspace member's unavailability dates",
  middleware: [workspaceAccess.fromParam()] as const,
  request: {
    params: memberParam,
    body: {
      required: true,
      content: {
        "application/json": { schema: setMemberUnavailabilityBody },
      },
    },
  },
  responses: {
    200: jsonResponse(
      "Updated member unavailability dates",
      memberUnavailabilityListSchema,
    ),
    400: errorResponse("The user is not a workspace member"),
    403: errorResponse("Only the member or a team manager can edit dates"),
  },
});

const createResourceRoute = createRoute({
  method: "post",
  operationId: "createResource",
  path: "/",
  tags: ["Resources"],
  summary: "Create a workspace resource",
  middleware: [workspaceAccess.fromBody()] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createResourceBody } },
    },
  },
  responses: {
    200: jsonResponse("Resource created", resourceSchema),
    400: errorResponse("Invalid resource or maintenance period"),
    403: errorResponse("No access to the workspace"),
    409: errorResponse("A resource with this name already exists"),
  },
});

const updateResourceRoute = createRoute({
  method: "put",
  operationId: "updateResource",
  path: "/{id}",
  tags: ["Resources"],
  summary: "Update a workspace resource",
  middleware: [workspaceAccess.fromResource()] as const,
  request: {
    params: resourceParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateResourceBody } },
    },
  },
  responses: {
    200: jsonResponse("Resource updated", resourceSchema),
    400: errorResponse("Invalid resource or maintenance period"),
    403: errorResponse("No access to the workspace"),
    404: errorResponse("Resource not found"),
    409: errorResponse("A resource with this name already exists"),
  },
});

const deleteResourceRoute = createRoute({
  method: "delete",
  operationId: "deleteResource",
  path: "/{id}",
  tags: ["Resources"],
  summary: "Delete a workspace resource",
  middleware: [workspaceAccess.fromResource()] as const,
  request: { params: resourceParam },
  responses: {
    200: jsonResponse("Resource deleted", resourceSchema),
    403: errorResponse("No access to the workspace"),
    404: errorResponse("Resource not found"),
  },
});

const readTaskResourcesRoute = createRoute({
  method: "get",
  operationId: "listTaskResources",
  path: "/task/{taskId}",
  tags: ["Resources"],
  summary: "List resources assigned to a task",
  middleware: [workspaceAccess.fromTaskId()] as const,
  request: { params: taskParam },
  responses: {
    200: jsonResponse("Task resources", resourceListSchema),
    403: errorResponse("No access to the task workspace"),
  },
});

const setTaskResourcesRoute = createRoute({
  method: "put",
  operationId: "setTaskResources",
  path: "/task/{taskId}",
  tags: ["Resources"],
  summary: "Replace the resources assigned to a task",
  middleware: [
    workspaceAccess.fromTaskId(),
    requireWorkspacePermission({ task: ["update"] }),
  ] as const,
  request: {
    params: taskParam,
    body: {
      required: true,
      content: { "application/json": { schema: setTaskResourcesBody } },
    },
  },
  responses: {
    200: jsonResponse("Updated task resources", resourceListSchema),
    400: errorResponse("A resource belongs to another workspace"),
    403: errorResponse("Missing task update permission"),
  },
});

const resource = apiRouter<BaseVariables & { workspaceId: string }>()
  .openapi(readWorkspaceResourcesRoute, async (c) =>
    c.json(await listResources(c.req.valid("param").workspaceId), 200),
  )
  .openapi(readWorkspaceConflictsRoute, async (c) =>
    c.json(await listResourceConflicts(c.req.valid("param").workspaceId), 200),
  )
  .openapi(readMemberUnavailabilityRoute, async (c) =>
    c.json(
      await listMemberUnavailability(c.req.valid("param").workspaceId),
      200,
    ),
  )
  .openapi(setMemberUnavailabilityRoute, async (c) => {
    const { workspaceId, userId } = c.req.valid("param");
    const canEditOtherMembers = await hasWorkspacePermission(c, {
      member: ["update"],
    });
    if (c.get("userId") !== userId && !canEditOtherMembers) {
      throw new HTTPException(403, {
        message: "Only the member or a team manager can edit availability",
      });
    }
    return c.json(
      await setMemberUnavailability(
        workspaceId,
        userId,
        c.req.valid("json").dates,
      ),
      200,
    );
  })
  .openapi(createResourceRoute, async (c) => {
    const body = c.req.valid("json");
    return c.json(await createResource(body.workspaceId, body), 200);
  })
  .openapi(updateResourceRoute, async (c) =>
    c.json(
      await updateResource(c.req.valid("param").id, c.req.valid("json")),
      200,
    ),
  )
  .openapi(deleteResourceRoute, async (c) =>
    c.json(await deleteResource(c.req.valid("param").id), 200),
  )
  .openapi(readTaskResourcesRoute, async (c) =>
    c.json(await listTaskResources(c.req.valid("param").taskId), 200),
  )
  .openapi(setTaskResourcesRoute, async (c) => {
    const taskId = c.req.valid("param").taskId;
    return c.json(
      await setTaskResources(
        taskId,
        c.get("workspaceId"),
        c.req.valid("json").resourceIds,
      ),
      200,
    );
  });

export default resource;
