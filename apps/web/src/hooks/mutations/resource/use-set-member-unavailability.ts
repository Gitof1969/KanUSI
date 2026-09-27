import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setMemberUnavailability } from "@/fetchers/resource/set-member-unavailability";

export function useSetMemberUnavailability(workspaceId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: setMemberUnavailability,
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["member-unavailability", workspaceId],
			});
			void queryClient.invalidateQueries({
				queryKey: ["resource-conflicts", workspaceId],
			});
		},
	});
}
