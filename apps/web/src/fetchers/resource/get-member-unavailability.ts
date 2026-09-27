import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export async function getMemberUnavailability(workspaceId: string) {
	const response = await client.resource.workspace[
		":workspaceId"
	].unavailability.$get({
		param: { workspaceId },
	});
	if (!response.ok) {
		throw new HttpError(response.status, await response.text());
	}
	return response.json();
}

export type MemberUnavailability = Awaited<
	ReturnType<typeof getMemberUnavailability>
>[number];
