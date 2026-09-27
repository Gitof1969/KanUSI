import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setTaskResources } from "@/fetchers/resource/set-task-resources";

export function useSetTaskResources(workspaceId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: setTaskResources,
		onSuccess: (_, variables) => {
			void queryClient.invalidateQueries({
				queryKey: ["task-resources", variables.taskId],
			});
			void queryClient.invalidateQueries({
				queryKey: ["resource-conflicts", workspaceId],
			});
			void queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
	});
}
