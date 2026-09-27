import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type CreateResourceRequest = InferRequestType<
	(typeof client)["resource"]["$post"]
>["json"];

export async function createResource(input: CreateResourceRequest) {
	const response = await client.resource.$post({ json: input });
	if (!response.ok) {
		throw new HttpError(response.status, await response.text());
	}
	return response.json();
}
