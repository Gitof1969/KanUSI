import { useQuery } from "@tanstack/react-query";
import { getMemberUnavailability } from "@/fetchers/resource/get-member-unavailability";

export function useMemberUnavailability(workspaceId: string) {
	return useQuery({
		queryKey: ["member-unavailability", workspaceId],
		queryFn: () => getMemberUnavailability(workspaceId),
		enabled: Boolean(workspaceId),
		refetchOnMount: true,
		refetchInterval: 30_000,
	});
}
