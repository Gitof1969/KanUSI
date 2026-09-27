import { Factory } from "lucide-react";
import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useSetTaskResources } from "@/hooks/mutations/resource/use-set-task-resources";
import { useResources } from "@/hooks/queries/resource/use-resources";
import { useTaskResources } from "@/hooks/queries/resource/use-task-resources";
import { toast } from "@/lib/toast";

export default function TaskResourcesDialog({
	taskId,
	workspaceId,
	children,
}: {
	taskId: string;
	workspaceId: string;
	children?: ReactNode;
}) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const { data: resources = [] } = useResources(workspaceId);
	const { data: assigned = [] } = useTaskResources(taskId);
	const update = useSetTaskResources(workspaceId);

	useEffect(() => {
		if (open) setSelectedIds(assigned.map((resource) => resource.id));
	}, [assigned, open]);

	const toggle = (id: string) => {
		setSelectedIds((current) =>
			current.includes(id)
				? current.filter((resourceId) => resourceId !== id)
				: [...current, id],
		);
	};

	const save = async () => {
		try {
			await update.mutateAsync({ taskId, resourceIds: selectedIds });
			toast.success(t("tasks:properties.resourcesUpdated"));
			setOpen(false);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: t("tasks:properties.resourcesUpdateError"),
			);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={children as ReactElement | undefined}>
				{children ? undefined : (
					<Button
						variant="ghost"
						size="sm"
						className="w-full justify-start gap-1.5"
					>
						<Factory />
						<span className="truncate text-xs font-semibold">
							{assigned.length
								? assigned.map((resource) => resource.name).join(", ")
								: t("tasks:properties.noResources")}
						</span>
					</Button>
				)}
			</DialogTrigger>
			<DialogPopup>
				<DialogHeader>
					<DialogTitle>{t("tasks:properties.resources")}</DialogTitle>
					<DialogDescription>
						{t("tasks:properties.resourcesDescription")}
					</DialogDescription>
				</DialogHeader>
				<DialogPanel>
					{resources.length ? (
						<div className="grid gap-2">
							{resources.map((resource) => (
								<div
									key={resource.id}
									className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
								>
									<Checkbox
										id={`task-resource-${resource.id}`}
										checked={selectedIds.includes(resource.id)}
										onCheckedChange={() => toggle(resource.id)}
									/>
									<label
										htmlFor={`task-resource-${resource.id}`}
										className="min-w-0 flex-1 cursor-pointer"
									>
										<span className="block truncate text-sm font-medium">
											{resource.name}
										</span>
										<span className="block truncate text-xs text-muted-foreground">
											{resource.type} ·{" "}
											{t(`workspace:resources.statuses.${resource.status}`)}
										</span>
									</label>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							{t("workspace:resources.emptyDescription")}
						</p>
					)}
				</DialogPanel>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						{t("workspace:resources.cancel")}
					</Button>
					<Button onClick={() => void save()} disabled={update.isPending}>
						{t("workspace:resources.save")}
					</Button>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}
