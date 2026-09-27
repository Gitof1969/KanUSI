import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export async function deleteResource(id: string) {
	const response = await client.resource[":id"].$delete({ param: { id } });
	if (!response.ok) {
		throw new HttpError(response.status, await response.text());
	}
	return response.json();
}
