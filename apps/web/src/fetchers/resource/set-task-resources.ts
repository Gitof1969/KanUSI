import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export async function setTaskResources({
	taskId,
	resourceIds,
}: {
	taskId: string;
	resourceIds: string[];
}) {
	const response = await client.resource.task[":taskId"].$put({
		param: { taskId },
		json: { resourceIds },
	});
	if (!response.ok) {
		throw new HttpError(response.status, await response.text());
	}
	return response.json();
}
