"use client";

import {
  BellIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShieldAlertIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import {
  createNotificationChannelAction,
  deleteNotificationChannelAction,
  toggleNotificationChannelEnabledAction,
  updateNotificationChannelAction,
} from "@/lib/actions/notifications";
import type { NotificationChannel } from "@/lib/db/crud/notifications";
import { getAllChannelTypes, getChannelType } from "./channels/registry";

interface NotificationChannelsClientProps {
  initialChannels: NotificationChannel[];
}

export function NotificationChannelsClient({
  initialChannels,
}: NotificationChannelsClientProps) {
  const router = useRouter();
  const availableTypes = getAllChannelTypes();

  const [channels, setChannels] =
    useState<NotificationChannel[]>(initialChannels);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Create Channel Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<string>(
    availableTypes[0]?.id || "discord",
  );
  const [createConfig, setCreateConfig] = useState<Record<string, unknown>>(
    getChannelType(availableTypes[0]?.id || "discord").defaultConfig,
  );
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Channel Modal State
  const [editingChannel, setEditingChannel] =
    useState<NotificationChannel | null>(null);
  const [editName, setEditName] = useState("");
  const [editConfig, setEditConfig] = useState<Record<string, unknown>>({});
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Channel Confirmation Modal State
  const [deletingChannel, setDeletingChannel] =
    useState<NotificationChannel | null>(null);

  // Filter channels based on search query
  const filteredChannels = channels.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.type.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Handle Type Change during creation
  const handleCreateTypeChange = (newType: string) => {
    setCreateType(newType);
    const def = getChannelType(newType);
    setCreateConfig(def.defaultConfig);
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    const defaultType = availableTypes[0]?.id || "discord";
    setCreateName("");
    setCreateType(defaultType);
    setCreateConfig(getChannelType(defaultType).defaultConfig);
    setCreateError(null);
    setIsCreateOpen(true);
  };

  // Handle Create Channel Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createName.trim()) {
      setCreateError("Channel name is required");
      return;
    }

    const typeDef = getChannelType(createType);
    const validationError = typeDef.validate(createConfig);
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    const formData = new FormData();
    formData.append("name", createName.trim());
    formData.append("type", createType);
    formData.append("config", JSON.stringify(createConfig));

    startTransition(async () => {
      const res = await createNotificationChannelAction(null, formData);
      if (res.success && res.data) {
        setChannels((prev) => [res.data as NotificationChannel, ...prev]);
        toast.success("Notification channel created successfully");
        setIsCreateOpen(false);
        router.refresh();
      } else {
        const errorMsg =
          typeof res.error === "string"
            ? res.error
            : typeof res.error === "object" && res.error !== null
              ? JSON.stringify(res.error)
              : "Failed to create channel";
        setCreateError(errorMsg);
        toast.error(errorMsg);
      }
    });
  };

  // Open Edit Dialog
  const handleOpenEdit = (channel: NotificationChannel) => {
    setEditingChannel(channel);
    setEditName(channel.name);
    setEditConfig(channel.config || {});
    setEditError(null);
  };

  // Handle Edit Channel Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError("Channel name is required");
      return;
    }

    const typeDef = getChannelType(editingChannel.type);
    const validationError = typeDef.validate(editConfig);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    const formData = new FormData();
    formData.append("name", editName.trim());
    formData.append("config", JSON.stringify(editConfig));

    startTransition(async () => {
      const res = await updateNotificationChannelAction(
        editingChannel.id,
        null,
        formData,
      );
      if (res.success && res.data) {
        const updated = res.data as NotificationChannel;
        setChannels((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        );
        toast.success("Notification channel updated successfully");
        setEditingChannel(null);
        router.refresh();
      } else {
        const errorMsg =
          typeof res.error === "string"
            ? res.error
            : typeof res.error === "object" && res.error !== null
              ? JSON.stringify(res.error)
              : "Failed to update channel";
        setEditError(errorMsg);
        toast.error(errorMsg);
      }
    });
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingChannel) return;
    const channelId = deletingChannel.id;

    startTransition(async () => {
      const res = await deleteNotificationChannelAction(channelId);
      if (res.success) {
        setChannels((prev) => prev.filter((c) => c.id !== channelId));
        toast.success("Notification channel deleted");
        setDeletingChannel(null);
        router.refresh();
      } else {
        const errorMsg =
          typeof res.error === "string"
            ? res.error
            : "Failed to delete channel";
        toast.error(errorMsg);
      }
    });
  };

  // Handle Toggle Enabled State
  const handleToggleEnabled = async (
    channel: NotificationChannel,
    newEnabled: boolean,
  ) => {
    // Optimistic UI update
    setChannels((prev) =>
      prev.map((c) =>
        c.id === channel.id ? { ...c, enabled: newEnabled } : c,
      ),
    );

    startTransition(async () => {
      const res = await toggleNotificationChannelEnabledAction(
        channel.id,
        newEnabled,
      );
      if (res.success && res.data) {
        toast.success(
          newEnabled
            ? `"${channel.name}" enabled`
            : `"${channel.name}" disabled`,
        );
        router.refresh();
      } else {
        // Revert on failure
        setChannels((prev) =>
          prev.map((c) =>
            c.id === channel.id ? { ...c, enabled: !newEnabled } : c,
          ),
        );
        const errorMsg =
          typeof res.error === "string"
            ? res.error
            : "Failed to toggle channel status";
        toast.error(errorMsg);
      }
    });
  };

  const createTypeDef = getChannelType(createType);
  const editTypeDef = editingChannel
    ? getChannelType(editingChannel.type)
    : null;

  return (
    <>
      <Toaster position="top-right" />

      <div className="flex flex-col gap-6">
        {/* Top Controls Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search notification channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
            <PlusIcon className="size-4" />
            Add Channel
          </Button>
        </div>

        {/* Empty State */}
        {filteredChannels.length === 0 && (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
              <BellIcon className="size-7" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {searchQuery
                ? "No channels match your search"
                : "No notification channels yet"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              {searchQuery
                ? "Try clearing your search query to see all configured notification channels."
                : "Create notification channels to receive instant alerts when your services go down."}
            </p>
            {!searchQuery && (
              <Button onClick={handleOpenCreate} className="gap-2">
                <PlusIcon className="size-4" />
                Configure your first channel
              </Button>
            )}
          </Card>
        )}

        {/* Channel Cards Grid */}
        {filteredChannels.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredChannels.map((channel) => {
              const typeDef = getChannelType(channel.type);
              const ChannelIcon = typeDef.icon;
              const ConfigSummary = typeDef.ConfigSummary;

              return (
                <Card
                  key={channel.id}
                  className={`relative flex flex-col transition-all hover:shadow-md ${
                    !channel.enabled ? "opacity-75 bg-muted/30" : ""
                  }`}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                        <ChannelIcon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle
                          className="text-base font-semibold truncate"
                          title={channel.name}
                        >
                          {channel.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className="capitalize text-xs font-mono"
                          >
                            {typeDef.name}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(channel.createdAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Enable / Disable Switch */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={channel.enabled}
                        onCheckedChange={(checked) =>
                          handleToggleEnabled(channel, checked)
                        }
                        disabled={isPending}
                        title={
                          channel.enabled ? "Disable channel" : "Enable channel"
                        }
                      />
                    </div>
                  </CardHeader>

                  {/* Dynamic Modular Config Summary */}
                  <CardContent className="flex-1 text-sm py-2">
                    <ConfigSummary config={channel.config} />
                  </CardContent>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between border-t px-6 py-3 bg-muted/10">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className={`size-2 rounded-full ${
                          channel.enabled
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-muted-foreground/50"
                        }`}
                      />
                      {channel.enabled ? "Active" : "Disabled"}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(channel)}
                        disabled={isPending}
                        className="h-8 gap-1.5 text-xs"
                      >
                        <PencilIcon className="size-3.5" />
                        Edit
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingChannel(channel)}
                        disabled={isPending}
                        className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2Icon className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* CREATE CHANNEL DIALOG */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BellIcon className="size-5 text-primary" />
                Add Notification Channel
              </DialogTitle>
              <DialogDescription>
                Configure a new notification channel to receive monitor alerts.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
              {createError && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-xs text-destructive">
                  <ShieldAlertIcon className="size-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="create-name">Channel Name</Label>
                <Input
                  id="create-name"
                  placeholder="e.g. Production Alerts"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-type">Channel Type</Label>
                <Select
                  value={createType}
                  onValueChange={handleCreateTypeChange}
                  disabled={isPending}
                >
                  <SelectTrigger id="create-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {createTypeDef.description}
                </p>
              </div>

              {/* Dynamic Modular Config Form Fields */}
              <createTypeDef.ConfigForm
                config={createConfig}
                onChange={setCreateConfig}
                disabled={isPending}
              />

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="gap-2">
                  {isPending && <Loader2Icon className="size-4 animate-spin" />}
                  Create Channel
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* EDIT CHANNEL DIALOG */}
        <Dialog
          open={!!editingChannel}
          onOpenChange={(open) => !open && setEditingChannel(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PencilIcon className="size-5 text-primary" />
                Edit Notification Channel
              </DialogTitle>
              <DialogDescription>
                Update configuration for &quot;{editingChannel?.name}&quot;.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              {editError && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-xs text-destructive">
                  <ShieldAlertIcon className="size-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-name">Channel Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>

              {/* Dynamic Modular Config Form Fields */}
              {editTypeDef && (
                <editTypeDef.ConfigForm
                  config={editConfig}
                  onChange={setEditConfig}
                  disabled={isPending}
                />
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingChannel(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="gap-2">
                  {isPending && <Loader2Icon className="size-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRMATION DIALOG */}
        <Dialog
          open={!!deletingChannel}
          onOpenChange={(open) => !open && setDeletingChannel(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <Trash2Icon className="size-5" />
                Delete Notification Channel
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{deletingChannel?.name}
                &quot;? Monitors associated with this channel will stop sending
                alerts.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeletingChannel(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isPending}
                className="gap-2"
              >
                {isPending && <Loader2Icon className="size-4 animate-spin" />}
                Delete Channel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
