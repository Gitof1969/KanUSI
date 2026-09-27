import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "@/components/ui/dialog";
import type { MemberUnavailability } from "@/fetchers/resource/get-member-unavailability";
import { useSetMemberUnavailability } from "@/hooks/mutations/resource/use-set-member-unavailability";
import { toast } from "@/lib/toast";
import type { WorkspaceUser } from "@/types/workspace-user";

function fromDateKey(value: string) {
	return new Date(`${value}T12:00:00`);
}

export default function MemberUnavailabilityDialog({
	workspaceId,
	member,
	entries,
	canEdit,
	onClose,
}: {
	workspaceId: string;
	member: WorkspaceUser | null;
	entries: MemberUnavailability[];
	canEdit: boolean;
	onClose: () => void;
}) {
	const { t } = useTranslation();
	const mutation = useSetMemberUnavailability(workspaceId);
	const memberDates = useMemo(
		() =>
			entries
				.filter((entry) => entry.userId === member?.userId)
				.map((entry) => fromDateKey(entry.unavailableDate)),
		[entries, member?.userId],
	);
	const [selected, setSelected] = useState<Date[]>([]);

	useEffect(() => {
		setSelected(memberDates);
	}, [memberDates]);

	const save = async () => {
		if (!member) return;
		try {
			await mutation.mutateAsync({
				workspaceId,
				userId: member.userId,
				dates: selected.map((date) => format(date, "yyyy-MM-dd")).sort(),
			});
			toast.success(t("team:availability.saved"));
			onClose();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: t("team:availability.saveError"),
			);
		}
	};

	return (
		<Dialog open={Boolean(member)} onOpenChange={(open) => !open && onClose()}>
			<DialogPopup>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CalendarDays className="size-4" />
						{t("team:availability.title", {
							name: member?.user.name ?? "",
						})}
					</DialogTitle>
					<DialogDescription>
						{canEdit
							? t("team:availability.description")
							: t("team:availability.readOnlyDescription")}
					</DialogDescription>
				</DialogHeader>
				<DialogPanel className="flex flex-col items-center gap-3">
					<Calendar
						mode="multiple"
						selected={selected}
						onSelect={(dates) => canEdit && setSelected(dates ?? [])}
						disabled={canEdit ? undefined : () => true}
					/>
					<p className="text-sm text-muted-foreground">
						{t("team:availability.selectedCount", {
							count: selected.length,
						})}
					</p>
				</DialogPanel>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						{t("common:actions.cancel")}
					</Button>
					{canEdit ? (
						<Button onClick={() => void save()} disabled={mutation.isPending}>
							{mutation.isPending
								? t("team:availability.saving")
								: t("team:availability.save")}
						</Button>
					) : null}
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}
