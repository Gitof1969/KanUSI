import { useQuery } from "@tanstack/react-query";
import { getResources } from "@/fetchers/resource/get-resources";

export function useResources(workspaceId: string) {
	return useQuery({
		queryKey: ["resources", workspaceId],
		queryFn: () => getResources(workspaceId),
		enabled: Boolean(workspaceId),
	});
}
