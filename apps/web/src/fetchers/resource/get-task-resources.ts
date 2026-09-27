import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export async function getTaskResources(taskId: string) {
	const response = await client.resource.task[":taskId"].$get({
		param: { taskId },
	});
	if (!response.ok) {
		throw new HttpError(response.status, await response.text());
	}
	return response.json();
}
