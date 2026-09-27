import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export async function setMemberUnavailability({
	workspaceId,
	userId,
	dates,
}: {
	workspaceId: string;
	userId: string;
	dates: string[];
}) {
	const response = await client.resource.workspace[":workspaceId"].member[
		":userId"
	].unavailability.$put({
		param: { workspaceId, userId },
		json: { dates },
	});
	if (!response.ok) {
		throw new HttpError(response.status, await response.text());
	}
	return response.json();
}
