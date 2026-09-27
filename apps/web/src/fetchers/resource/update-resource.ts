import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

type UpdateBody = InferRequestType<
	(typeof client)["resource"][":id"]["$put"]
>["json"];

export async function updateResource(input: UpdateBody & { id: string }) {
	const { id, ...json } = input;
	const response = await client.resource[":id"].$put({
		param: { id },
		json,
	});
	if (!response.ok) {
		throw new HttpError(response.status, await response.text());
	}
	return response.json();
}
