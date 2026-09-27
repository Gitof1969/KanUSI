import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Wrench,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Resource } from "@/fetchers/resource/get-resources";
import {
  useCreateResource,
  useDeleteResource,
  useUpdateResource,
} from "@/hooks/mutations/resource/use-resource-mutations";
import { useResourceConflicts } from "@/hooks/queries/resource/use-resource-conflicts";
import { useResources } from "@/hooks/queries/resource/use-resources";
import { formatDateMedium } from "@/lib/format";
import { toast } from "@/lib/toast";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/resources",
)({ component: ResourceManagementPage });

type ResourceStatus = Resource["status"];

type ResourceForm = {
  name: string;
  type: string;
  description: string;
  status: ResourceStatus;
  maintenanceStart: string;
  maintenanceEnd: string;
};

const EMPTY_FORM: ResourceForm = {
  name: "",
  type: "",
  description: "",
  status: "operational",
  maintenanceStart: "",
  maintenanceEnd: "",
};

function dateInputValue(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function datePayload(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : null;
}

function ResourceManagementPage() {
  const { t } = useTranslation();
  const { workspaceId } = Route.useParams();
  const {
    data: resources = [],
    isLoading,
    isFetching: resourcesFetching,
    refetch: refetchResources,
  } = useResources(workspaceId);
  const {
    data: conflicts = [],
    isFetching: conflictsFetching,
    refetch: refetchConflicts,
  } = useResourceConflicts(workspaceId);
  const createResource = useCreateResource();
  const updateResource = useUpdateResource(workspaceId);
  const deleteResource = useDeleteResource(workspaceId);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [form, setForm] = useState<ResourceForm>(EMPTY_FORM);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (resource: Resource) => {
    setEditing(resource);
    setForm({
      name: resource.name,
      type: resource.type,
      description: resource.description ?? "",
      status: resource.status,
      maintenanceStart: dateInputValue(resource.maintenanceStart),
      maintenanceEnd: dateInputValue(resource.maintenanceEnd),
    });
    setDialogOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      name: form.name,
      type: form.type,
      description: form.description || null,
      status: form.status,
      maintenanceStart:
        form.status === "maintenance"
          ? datePayload(form.maintenanceStart)
          : null,
      maintenanceEnd:
        form.status === "maintenance" ? datePayload(form.maintenanceEnd) : null,
    };

    try {
      if (editing) {
        await updateResource.mutateAsync({ id: editing.id, ...payload });
        toast.success(t("workspace:resources.updated"));
      } else {
        await createResource.mutateAsync({ workspaceId, ...payload });
        toast.success(t("workspace:resources.created"));
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("workspace:resources.saveError"),
      );
    }
  };

  const remove = async (resource: Resource) => {
    if (!window.confirm(t("workspace:resources.deleteConfirm"))) return;
    try {
      await deleteResource.mutateAsync(resource.id);
      toast.success(t("workspace:resources.deleted"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("workspace:resources.deleteError"),
      );
    }
  };

  const statusBadge = (status: ResourceStatus) => {
    const variant =
      status === "operational"
        ? "success"
        : status === "maintenance"
          ? "warning"
          : "error";
    return (
      <Badge variant={variant}>
        {t(`workspace:resources.statuses.${status}`)}
      </Badge>
    );
  };

  const conflictText = (conflict: (typeof conflicts)[number]) => {
    if (conflict.kind === "maintenance") {
      return t("workspace:resources.maintenanceConflict");
    }
    if (conflict.kind === "unavailable") {
      return t("workspace:resources.unavailableConflict");
    }
    if (conflict.kind === "member_unavailable") {
      return t("workspace:resources.memberUnavailableConflict", {
        date: conflict.unavailableDate
          ? formatDateMedium(`${conflict.unavailableDate}T12:00:00`)
          : "",
      });
    }
    const conflictingTask = conflict.conflictingTask;
    const taskName = conflictingTask
      ? `${conflictingTask.projectName} #${conflictingTask.number ?? "–"} — ${conflictingTask.title}`
      : "";
    return conflict.kind === "resource"
      ? t("workspace:resources.resourceConflict", { task: taskName })
      : t("workspace:resources.assigneeConflict", { task: taskName });
  };

  return (
    <>
      <PageTitle title={t("workspace:resources.pageTitle")} />
      <WorkspaceLayout
        title={t("workspace:resources.pageTitle")}
        headerActions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              disabled={resourcesFetching || conflictsFetching}
              onClick={() =>
                void Promise.all([refetchResources(), refetchConflicts()])
              }
            >
              <RefreshCw
                className={
                  resourcesFetching || conflictsFetching
                    ? "animate-spin"
                    : undefined
                }
              />
              {t("workspace:resources.refresh")}
            </Button>
            <Button size="xs" onClick={openCreate}>
              <Plus />
              {t("workspace:resources.create")}
            </Button>
          </div>
        }
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
          <div>
            <h1 className="text-xl font-semibold">
              {t("workspace:resources.pageTitle")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("workspace:resources.subtitle")}
            </p>
          </div>

          <section className="rounded-xl border bg-card">
            {isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">…</div>
            ) : resources.length === 0 ? (
              <Empty className="py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Wrench />
                  </EmptyMedia>
                  <EmptyTitle>{t("workspace:resources.emptyTitle")}</EmptyTitle>
                  <EmptyDescription>
                    {t("workspace:resources.emptyDescription")}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("workspace:resources.name")}</TableHead>
                    <TableHead>{t("workspace:resources.type")}</TableHead>
                    <TableHead>{t("workspace:resources.status")}</TableHead>
                    <TableHead>
                      {t("workspace:resources.maintenanceStart")}
                    </TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell>
                        <div className="font-medium">{resource.name}</div>
                        {resource.description ? (
                          <div className="max-w-md truncate text-xs text-muted-foreground">
                            {resource.description}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{resource.type}</TableCell>
                      <TableCell>{statusBadge(resource.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {resource.maintenanceStart && resource.maintenanceEnd
                          ? `${formatDateMedium(resource.maintenanceStart)} – ${formatDateMedium(resource.maintenanceEnd)}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label={t("workspace:resources.edit")}
                            onClick={() => openEdit(resource)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label={t("workspace:resources.delete")}
                            onClick={() => void remove(resource)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={
                  conflicts.length
                    ? "text-destructive"
                    : "text-muted-foreground"
                }
              />
              <div>
                <h2 className="font-medium">
                  {t("workspace:resources.conflicts")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {conflicts.length
                    ? t("workspace:resources.conflictCount", {
                        count: conflicts.length,
                      })
                    : t("workspace:resources.noConflicts")}
                </p>
              </div>
            </div>
            {conflicts.length ? (
              <div className="mt-4 divide-y rounded-lg border">
                {conflicts.map((conflict, index) => (
                  <div
                    key={`${conflict.kind}-${conflict.task.id}-${conflict.conflictingTask?.id ?? index}`}
                    className="p-3 text-sm"
                  >
                    <span className="font-medium">
                      {conflict.resourceName ?? conflict.assigneeName}:{" "}
                      {conflict.task.projectName} #{conflict.task.number ?? "–"}{" "}
                      — {conflict.task.title}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {conflictText(conflict)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </WorkspaceLayout>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogPopup>
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>
                {editing
                  ? t("workspace:resources.edit")
                  : t("workspace:resources.create")}
              </DialogTitle>
              <DialogDescription>
                {t("workspace:resources.subtitle")}
              </DialogDescription>
            </DialogHeader>
            <DialogPanel className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="resource-name">
                  {t("workspace:resources.name")}
                </Label>
                <Input
                  id="resource-name"
                  required
                  value={form.name}
                  placeholder={t("workspace:resources.namePlaceholder")}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="resource-type">
                  {t("workspace:resources.type")}
                </Label>
                <Input
                  id="resource-type"
                  required
                  value={form.type}
                  placeholder={t("workspace:resources.typePlaceholder")}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="resource-description">
                  {t("workspace:resources.description")}
                </Label>
                <Textarea
                  id="resource-description"
                  value={form.description}
                  placeholder={t("workspace:resources.descriptionPlaceholder")}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="resource-status">
                  {t("workspace:resources.status")}
                </Label>
                <select
                  id="resource-status"
                  className="h-9 rounded-lg border bg-background px-3 text-sm"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as ResourceStatus,
                    }))
                  }
                >
                  <option value="operational">
                    {t("workspace:resources.statuses.operational")}
                  </option>
                  <option value="maintenance">
                    {t("workspace:resources.statuses.maintenance")}
                  </option>
                  <option value="out_of_service">
                    {t("workspace:resources.statuses.out_of_service")}
                  </option>
                </select>
              </div>
              {form.status === "maintenance" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="maintenance-start">
                      {t("workspace:resources.maintenanceStart")}
                    </Label>
                    <Input
                      id="maintenance-start"
                      type="date"
                      required
                      value={form.maintenanceStart}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          maintenanceStart: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="maintenance-end">
                      {t("workspace:resources.maintenanceEnd")}
                    </Label>
                    <Input
                      id="maintenance-end"
                      type="date"
                      required
                      min={form.maintenanceStart || undefined}
                      value={form.maintenanceEnd}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          maintenanceEnd: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}
            </DialogPanel>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                {t("workspace:resources.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createResource.isPending || updateResource.isPending}
              >
                {createResource.isPending || updateResource.isPending
                  ? t("workspace:resources.saving")
                  : t("workspace:resources.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>
    </>
  );
}
