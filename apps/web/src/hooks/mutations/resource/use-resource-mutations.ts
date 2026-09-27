import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	type CreateResourceRequest,
	createResource,
} from "@/fetchers/resource/create-resource";
import { deleteResource } from "@/fetchers/resource/delete-resource";
import { updateResource } from "@/fetchers/resource/update-resource";

export function useCreateResource() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createResource,
		onSuccess: (_, variables: CreateResourceRequest) => {
			void queryClient.invalidateQueries({
				queryKey: ["resources", variables.workspaceId],
			});
			void queryClient.invalidateQueries({
				queryKey: ["resource-conflicts", variables.workspaceId],
			});
			void queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
	});
}

export function useUpdateResource(workspaceId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: updateResource,
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["resources", workspaceId],
			});
			void queryClient.invalidateQueries({
				queryKey: ["resource-conflicts", workspaceId],
			});
			void queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
	});
}

export function useDeleteResource(workspaceId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteResource,
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["resources", workspaceId],
			});
			void queryClient.invalidateQueries({
				queryKey: ["resource-conflicts", workspaceId],
			});
			void queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
	});
}
