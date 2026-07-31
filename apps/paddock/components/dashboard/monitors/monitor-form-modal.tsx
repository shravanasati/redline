"use client";

import {
  BellIcon,
  ExternalLinkIcon,
  LoaderIcon,
  MailIcon,
  MessageSquareIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createMonitorAction,
  updateMonitorAction,
} from "@/lib/actions/monitors";
import { fetchNotificationRulesByMonitorAction } from "@/lib/actions/notifications";
import type { NotificationChannel } from "@/lib/db/crud/notifications";

type MonitorMetadata = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

type Monitor = {
  id: string;
  name: string;
  type: "ICMP" | "HTTP" | "HTTPS" | "TCP" | "DNS";
  endpoint: string;
  frequency: number;
  timeout: number;
  status: "active" | "paused" | "draft";
  assertions?: AssertionItem[];
  metadata?: MonitorMetadata;
};

type CreateMonitorModalProps = {
  mode: "create";
  channels?: NotificationChannel[];
};

type EditMonitorModalProps = {
  mode: "edit";
  monitor: Monitor;
  channels?: NotificationChannel[];
};

type MonitorFormModalProps = CreateMonitorModalProps | EditMonitorModalProps;

type AssertionTarget = "status_code" | "body" | "response_time";
type AssertionOperator = "equals" | "contains" | "less_than";

type AssertionItem = {
  id: string;
  target: AssertionTarget;
  operator: AssertionOperator;
  value: string | number;
};

type HeaderItem = {
  id: string;
  key: string;
  value: string;
};

type NotificationEventType =
  | "INCIDENT_OPENED"
  | "INCIDENT_RESOLVED"
  | "LATENCY_DEGRADED";

type NotificationRuleState = {
  channelId: string;
  event: NotificationEventType;
  enabled: boolean;
};

const MONITOR_TYPES = ["ICMP", "HTTP", "HTTPS", "TCP", "DNS"] as const;

const FREQUENCY_OPTIONS = [
  { label: "30 seconds", value: 30 },
  { label: "1 minute", value: 60 },
  { label: "2 minutes", value: 120 },
  { label: "3 minutes", value: 180 },
  { label: "5 minutes", value: 300 },
  { label: "10 minutes", value: 600 },
  { label: "15 minutes", value: 900 },
  { label: "30 minutes", value: 1800 },
  { label: "60 minutes", value: 3600 },
] as const;

type FrequencyValue = (typeof FREQUENCY_OPTIONS)[number]["value"];

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-destructive mt-0.5">{errors[0]}</p>;
}

export function MonitorFormModal(props: MonitorFormModalProps) {
  const isEdit = props.mode === "edit";
  const monitor = isEdit ? props.monitor : undefined;
  const channels = props.channels ?? [];

  // Bind monitorId for edit mode
  const boundUpdateAction =
    isEdit && monitor ? updateMonitorAction.bind(null, monitor.id) : null;

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
  const [activeTab, setActiveTab] = useState<string>("general");
  const formRef = useRef<HTMLFormElement>(null);

  // Controlled states
  const [type, setType] = useState<string>("HTTP");
  const [frequency, setFrequency] = useState<FrequencyValue>(60);
  const [assertions, setAssertions] = useState<AssertionItem[]>([]);
  const [method, setMethod] = useState<string>("GET");
  const [headersList, setHeadersList] = useState<HeaderItem[]>([]);
  const [reqBody, setReqBody] = useState<string>("");
  const [notificationRules, setNotificationRules] = useState<
    NotificationRuleState[]
  >([]);
  const [isLoadingRules, setIsLoadingRules] = useState<boolean>(false);

  // Snap frequency
  const snapFrequency = useCallback((v?: number): FrequencyValue => {
    const match = FREQUENCY_OPTIONS.find((o) => o.value === v);
    return match ? match.value : 60;
  }, []);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      setOpen(false);
      formRef.current?.reset();
    }
  }, [state]);

  // Reset/sync state when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab("general");
      if (!isEdit) {
        setType("HTTP");
        setFrequency(60);
        setAssertions([]);
        setMethod("GET");
        setHeadersList([]);
        setReqBody("");

        // Default rules: enable INCIDENT_OPENED & INCIDENT_RESOLVED for active channels
        const defaultRules: NotificationRuleState[] = [];
        for (const channel of channels) {
          if (channel.enabled) {
            defaultRules.push(
              {
                channelId: channel.id,
                event: "INCIDENT_OPENED",
                enabled: true,
              },
              {
                channelId: channel.id,
                event: "INCIDENT_RESOLVED",
                enabled: true,
              },
              {
                channelId: channel.id,
                event: "LATENCY_DEGRADED",
                enabled: false,
              },
            );
          }
        }
        setNotificationRules(defaultRules);
      } else if (monitor) {
        setType(monitor.type);
        setFrequency(snapFrequency(monitor.frequency));
        setAssertions(monitor.assertions ?? []);
        setMethod(monitor.metadata?.method ?? "GET");
        setHeadersList(
          Object.entries(monitor.metadata?.headers ?? {}).map(
            ([key, value]) => ({
              id: crypto.randomUUID(),
              key,
              value: String(value),
            }),
          ),
        );
        setReqBody(monitor.metadata?.body ?? "");

        // Fetch existing notification rules for monitor
        setIsLoadingRules(true);
        fetchNotificationRulesByMonitorAction(monitor.id).then((res) => {
          setIsLoadingRules(false);
          if (res.success && res.data) {
            const existingRules: NotificationRuleState[] = res.data.map(
              (r) => ({
                channelId: r.channelId,
                event: r.event as NotificationEventType,
                enabled: r.enabled,
              }),
            );
            setNotificationRules(existingRules);
          }
        });
      }
    }
  }, [open, isEdit, monitor, snapFrequency, channels]);

  // Handle Rule toggle
  const toggleNotificationRule = (
    channelId: string,
    event: NotificationEventType,
  ) => {
    setNotificationRules((prev) => {
      const existingIdx = prev.findIndex(
        (r) => r.channelId === channelId && r.event === event,
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          enabled: !updated[existingIdx].enabled,
        };
        return updated;
      }
      return [...prev, { channelId, event, enabled: true }];
    });
  };

  // Handle Assertion additions
  const addAssertion = () => {
    if (assertions.length >= 5) return;
    setAssertions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        target: "status_code",
        operator: "equals",
        value: 200,
      },
    ]);
  };

  const removeAssertion = (index: number) => {
    setAssertions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAssertion = (
    index: number,
    field: keyof AssertionItem,
    val: string | number,
  ) => {
    setAssertions((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: val };

        // Auto-correct operator and values when target changes
        if (field === "target") {
          if (val === "status_code") {
            updated.operator = "equals";
            updated.value = 200;
          } else if (val === "response_time") {
            updated.operator = "less_than";
            updated.value = 1000;
          } else if (val === "body") {
            updated.operator = "contains";
            updated.value = "";
          }
        }
        return updated;
      }),
    );
  };

  // Handle Header additions
  const addHeader = () => {
    if (headersList.length >= 5) return;
    setHeadersList((prev) => [
      ...prev,
      { id: crypto.randomUUID(), key: "", value: "" },
    ]);
  };

  const removeHeader = (id: string) => {
    setHeadersList((prev) => prev.filter((item) => item.id !== id));
  };

  const updateHeader = (id: string, field: keyof HeaderItem, val: string) => {
    setHeadersList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item)),
    );
  };

  // Serialize lists for hidden inputs
  const serializedHeaders = headersList.reduce(
    (acc, curr) => {
      if (curr.key.trim()) {
        acc[curr.key.trim()] = curr.value;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  const serializedMetadata = {
    method,
    headers:
      Object.keys(serializedHeaders).length > 0 ? serializedHeaders : undefined,
    body: method !== "GET" && reqBody.trim() ? reqBody : undefined,
  };

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

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Monitor" : "Create Monitor"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update details, assertions, and notification rules for this monitor."
              : "Add a new endpoint monitor to track its uptime and performance."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={action} className="flex flex-col gap-4">
          {/* Hidden inputs for complex values */}
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="frequency" value={frequency} />
          <input
            type="hidden"
            name="assertions"
            value={JSON.stringify(assertions)}
          />
          <input
            type="hidden"
            name="metadata"
            value={JSON.stringify(serializedMetadata)}
          />
          <input
            type="hidden"
            name="notificationRules"
            value={JSON.stringify(notificationRules.filter((r) => r.enabled))}
          />

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="assertions">Assertions</TabsTrigger>
              <TabsTrigger value="metadata">Headers & Body</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general" className="flex flex-col gap-4 pt-3">
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

              <div className="grid grid-cols-3 gap-3">
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
                  <Label>Frequency</Label>
                  <Select
                    value={String(frequency)}
                    onValueChange={(v) =>
                      setFrequency(Number(v) as FrequencyValue)
                    }
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
                    <span className="text-muted-foreground text-xs">
                      (1-60s)
                    </span>
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
            </TabsContent>

            {/* Assertions Settings */}
            <TabsContent
              value="assertions"
              className="flex flex-col gap-3 pt-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">
                    Rules & Thresholds
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Define what conditions count as a successful check.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAssertion}
                  className="gap-1"
                  disabled={assertions.length >= 5}
                >
                  <PlusIcon className="size-3.5" />
                  Add Rule
                </Button>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                {assertions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-2xl text-muted-foreground text-xs">
                    No rules specified. Defaults to HTTP Status 200 OK.
                  </div>
                ) : (
                  assertions.map((assertion, idx) => (
                    <div
                      key={assertion.id}
                      className="flex items-center gap-2 bg-muted/40 p-2 rounded-2xl border border-transparent dark:border-foreground/5"
                    >
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        {/* Target Select */}
                        <Select
                          value={assertion.target}
                          onValueChange={(val) =>
                            updateAssertion(
                              idx,
                              "target",
                              val as AssertionTarget,
                            )
                          }
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="status_code">
                              Status Code
                            </SelectItem>
                            <SelectItem value="response_time">
                              Response Time (ms)
                            </SelectItem>
                            <SelectItem value="body">Response Body</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Operator Select */}
                        <Select
                          value={assertion.operator}
                          onValueChange={(val) =>
                            updateAssertion(
                              idx,
                              "operator",
                              val as AssertionOperator,
                            )
                          }
                          disabled={
                            assertion.target === "status_code" ||
                            assertion.target === "response_time"
                          }
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                            <SelectItem value="less_than">Less than</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Value Input */}
                        <Input
                          type={assertion.target === "body" ? "text" : "number"}
                          className="bg-background"
                          value={assertion.value}
                          onChange={(e) =>
                            updateAssertion(
                              idx,
                              "value",
                              assertion.target === "body"
                                ? e.target.value
                                : Number(e.target.value),
                            )
                          }
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeAssertion(idx)}
                        className="hover:bg-destructive/10 hover:text-destructive shrink-0"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <FieldError errors={fieldErrors?.assertions} />
            </TabsContent>

            {/* Metadata (Headers & Request Options) */}
            <TabsContent value="metadata" className="flex flex-col gap-4 pt-3">
              <div className="grid grid-cols-3 gap-3 items-end">
                <div className="flex flex-col gap-1.5 col-span-1">
                  <Label>HTTP Method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="GET" />
                    </SelectTrigger>
                    <SelectContent>
                      {["GET", "POST", "HEAD"].map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addHeader}
                    className="gap-1"
                    disabled={headersList.length >= 5}
                  >
                    <PlusIcon className="size-3.5" />
                    Add Header
                  </Button>
                </div>
              </div>

              {/* Headers List */}
              <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                {headersList.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-xl">
                    No custom headers configured.
                  </p>
                ) : (
                  headersList.map((header) => (
                    <div key={header.id} className="flex items-center gap-2">
                      <Input
                        placeholder="Header-Name"
                        value={header.key}
                        onChange={(e) =>
                          updateHeader(header.id, "key", e.target.value)
                        }
                        className="flex-1"
                        required
                      />
                      <Input
                        placeholder="value"
                        value={header.value}
                        onChange={(e) =>
                          updateHeader(header.id, "value", e.target.value)
                        }
                        className="flex-1"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeHeader(header.id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <FieldError errors={fieldErrors?.metadata} />

              {/* Request Body (only for non-GET methods) */}
              {method === "POST" && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="req-body">Request Body</Label>
                    <span className="text-xs text-muted-foreground">
                      {reqBody.length}/500
                    </span>
                  </div>
                  <textarea
                    id="req-body"
                    placeholder='{"key": "value"}'
                    value={reqBody}
                    onChange={(e) => setReqBody(e.target.value)}
                    maxLength={500}
                    className="min-h-20 w-full rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm transition-[color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              )}
            </TabsContent>

            {/* Notification Rules Tab */}
            <TabsContent value="notifications" className="flex flex-col gap-3 pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Notification Rules</Label>
                  <p className="text-xs text-muted-foreground">
                    Select which channels receive alerts for monitor incidents.
                  </p>
                </div>
                <Link
                  href="/dashboard/settings"
                  target="_blank"
                  className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  Manage Channels
                  <ExternalLinkIcon className="size-3" />
                </Link>
              </div>

              {channels.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-2xl text-center gap-2">
                  <BellIcon className="size-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium">No Notification Channels</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Set up Discord or Email channels in Settings to dispatch alerts when this monitor triggers an incident.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-1.5"
                    asChild
                  >
                    <Link href="/dashboard/settings" target="_blank">
                      <span>Manage Channels</span>
                      <ExternalLinkIcon className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              ) : isLoadingRules ? (
                <div className="flex items-center justify-center py-8">
                  <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto pr-1">
                  {channels.map((channel) => {
                    const eventList: Array<{
                      key: NotificationEventType;
                      label: string;
                      badgeClass: string;
                    }> = [
                      {
                        key: "INCIDENT_OPENED",
                        label: "Incident Opened",
                        badgeClass:
                          "text-destructive border-destructive/30 bg-destructive/10",
                      },
                      {
                        key: "INCIDENT_RESOLVED",
                        label: "Incident Resolved",
                        badgeClass:
                          "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
                      },
                      {
                        key: "LATENCY_DEGRADED",
                        label: "Latency Degraded",
                        badgeClass:
                          "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10",
                      },
                    ];

                    return (
                      <div
                        key={channel.id}
                        className="flex flex-col gap-2 p-3 bg-muted/40 rounded-2xl border border-border/40"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {channel.type === "discord" ? (
                              <MessageSquareIcon className="size-4 text-indigo-500 dark:text-indigo-400" />
                            ) : (
                              <MailIcon className="size-4 text-sky-500 dark:text-sky-400" />
                            )}
                            <span className="font-medium text-sm">
                              {channel.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] capitalize py-0 px-1.5 font-normal"
                            >
                              {channel.type}
                            </Badge>
                          </div>
                          {!channel.enabled && (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground border-amber-500/30 bg-amber-500/10"
                            >
                              Disabled
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1">
                          {eventList.map((evt) => {
                            const rule = notificationRules.find(
                              (r) =>
                                r.channelId === channel.id &&
                                r.event === evt.key,
                            );
                            const isEnabled = rule?.enabled ?? false;

                            return (
                              <button
                                key={evt.key}
                                type="button"
                                onClick={() =>
                                  toggleNotificationRule(channel.id, evt.key)
                                }
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs transition-colors ${
                                  isEnabled
                                    ? evt.badgeClass
                                    : "border-muted bg-background text-muted-foreground hover:bg-muted/50"
                                }`}
                              >
                                <span>{evt.label}</span>
                                <span
                                  className={`size-2 rounded-full ${
                                    isEnabled
                                      ? "bg-current"
                                      : "bg-muted-foreground/30"
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <FieldError errors={fieldErrors?.notificationRules} />
            </TabsContent>
          </Tabs>

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
