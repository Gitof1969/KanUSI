import { useQuery } from "@tanstack/react-query";
import { getResourceConflicts } from "@/fetchers/resource/get-resource-conflicts";

export function useResourceConflicts(workspaceId: string) {
	return useQuery({
		queryKey: ["resource-conflicts", workspaceId],
		queryFn: () => getResourceConflicts(workspaceId),
		enabled: Boolean(workspaceId),
		refetchOnMount: true,
		refetchInterval: 30_000,
	});
}
