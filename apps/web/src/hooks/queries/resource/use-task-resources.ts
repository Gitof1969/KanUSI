import { useQuery } from "@tanstack/react-query";
import { getTaskResources } from "@/fetchers/resource/get-task-resources";

export function useTaskResources(taskId: string) {
	return useQuery({
		queryKey: ["task-resources", taskId],
		queryFn: () => getTaskResources(taskId),
		enabled: Boolean(taskId),
	});
}
