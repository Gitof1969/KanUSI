import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export async function getResources(workspaceId: string) {
	const response = await client.resource.workspace[":workspaceId"].$get({
		param: { workspaceId },
	});
	if (!response.ok) {
		throw new HttpError(response.status, await response.text());
	}
	return response.json();
}

export type Resource = Awaited<ReturnType<typeof getResources>>[number];
