"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,

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
import { createMonitorAction, updateMonitorAction } from "@/lib/actions/monitors";
import { PlusIcon, PencilIcon, LoaderIcon } from "lucide-react";

type Monitor = {
  id: string;
  name: string;
  type: "ICMP" | "HTTP" | "HTTPS" | "TCP" | "DNS";
  endpoint: string;
  frequency: number;
  timeout: number;
  status: "active" | "paused" | "draft";
};

type CreateMonitorModalProps = {
  mode: "create";
};

type EditMonitorModalProps = {
  mode: "edit";
  monitor: Monitor;
};

type MonitorFormModalProps = CreateMonitorModalProps | EditMonitorModalProps;

const MONITOR_TYPES = ["ICMP", "HTTP", "HTTPS", "TCP", "DNS"] as const;
const MONITOR_STATUSES = ["active", "paused", "draft"] as const;

const FREQUENCY_OPTIONS = [
  { label: "30 seconds", value: 30 },
  { label: "1 minute",   value: 60 },
  { label: "2 minutes",  value: 120 },
  { label: "3 minutes",  value: 180 },
  { label: "5 minutes",  value: 300 },
  { label: "10 minutes", value: 600 },
  { label: "15 minutes", value: 900 },
  { label: "30 minutes", value: 1800 },
  { label: "60 minutes", value: 3600 },
] as const;

type FrequencyValue = (typeof FREQUENCY_OPTIONS)[number]["value"];

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p className="text-xs text-destructive mt-0.5">{errors[0]}</p>
  );
}

export function MonitorFormModal(props: MonitorFormModalProps) {
  const isEdit = props.mode === "edit";
  const monitor = isEdit ? props.monitor : undefined;

  // Bind monitorId for edit mode
  const boundUpdateAction = isEdit
    ? updateMonitorAction.bind(null, monitor!.id)
    : null;

  const [createState, createAction, createPending] = useActionState(
    createMonitorAction,
    null,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    boundUpdateAction ?? createMonitorAction,
    null,
  );

  const state = isEdit ? updateState : createState;
  const action = isEdit ? updateAction : createAction;
  const isPending = isEdit ? updatePending : createPending;

  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Select state (controlled, because Select is uncontrolled by default in radix)
  const [type, setType] = useState<string>(monitor?.type ?? "HTTP");
  const [status, setStatus] = useState<string>(monitor?.status ?? "active");

  // Snap the stored frequency to the nearest option, defaulting to 60s
  const snapFrequency = (v?: number): FrequencyValue => {
    const match = FREQUENCY_OPTIONS.find((o) => o.value === v);
    return match ? match.value : 60;
  };
  const [frequency, setFrequency] = useState<FrequencyValue>(
    snapFrequency(monitor?.frequency),
  );

  useEffect(() => {
    if (state && "success" in state && state.success) {
      setOpen(false);
      formRef.current?.reset();
    }
  }, [state]);

  // Reset selects when dialog opens
  useEffect(() => {
    if (!isEdit && open) {
      setType("HTTP");
      setStatus("active");
      setFrequency(60);
    }
    if (isEdit && open && monitor) {
      setType(monitor.type);
      setStatus(monitor.status);
      setFrequency(snapFrequency(monitor.frequency));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, monitor]);

  const fieldErrors =
    state && "error" in state && typeof state.error === "object"
      ? (state.error as Record<string, string[]>)
      : null;

  const globalError =
    state && "error" in state && typeof state.error === "string"
      ? state.error
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button
            variant="ghost"
            size="icon-sm"
            title="Edit monitor"
            className="hover:bg-primary/10 hover:text-primary"
          >
            <PencilIcon className="size-4" />
            <span className="sr-only">Edit</span>
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5">
            <PlusIcon className="size-4" />
            New Monitor
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Monitor" : "Create Monitor"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details for this monitor."
              : "Add a new endpoint monitor to track its uptime and performance."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={action} className="flex flex-col gap-4">
          {/* Hidden inputs for select values */}
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="frequency" value={frequency} />

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="monitor-name">Name</Label>
            <Input
              id="monitor-name"
              name="name"
              placeholder="My API Monitor"
              defaultValue={monitor?.name}
              required
            />
            <FieldError errors={fieldErrors?.name} />
          </div>

          {/* Endpoint */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="monitor-endpoint">Endpoint URL</Label>
            <Input
              id="monitor-endpoint"
              name="endpoint"
              type="url"
              placeholder="https://api.example.com/health"
              defaultValue={monitor?.endpoint}
              required
            />
            <FieldError errors={fieldErrors?.endpoint} />
          </div>

          {/* Type & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MONITOR_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={fieldErrors?.type} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {MONITOR_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="capitalize">{s}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={fieldErrors?.status} />
            </div>
          </div>

          {/* Frequency & Timeout */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Frequency</Label>
              <Select
                value={String(frequency)}
                onValueChange={(v) => setFrequency(Number(v) as FrequencyValue)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={fieldErrors?.frequency} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="monitor-timeout">
                Timeout{" "}
                <span className="text-muted-foreground text-xs">(1 – 60s)</span>
              </Label>
              <Input
                id="monitor-timeout"
                name="timeout"
                type="number"
                min={1}
                max={60}
                placeholder="30"
                defaultValue={monitor?.timeout ?? 30}
              />
              <FieldError errors={fieldErrors?.timeout} />
            </div>
          </div>

          {/* Global error */}
          {globalError && (
            <p className="text-sm text-destructive rounded-xl bg-destructive/10 px-3 py-2">
              {globalError}
            </p>
          )}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              {isPending && <LoaderIcon className="size-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Monitor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
