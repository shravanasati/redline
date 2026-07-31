"use client";

import { CopyIcon, EyeIcon, EyeOffIcon, MessageSquareIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ChannelConfigFormProps,
  ChannelConfigSummaryProps,
  ChannelTypeDefinition,
} from "./types";

function DiscordConfigForm({
  config,
  onChange,
  disabled,
  errors,
}: ChannelConfigFormProps) {
  const webhookUrl =
    typeof config.webhookUrl === "string" ? config.webhookUrl : "";

  return (
    <div className="space-y-2">
      <Label htmlFor="discord-webhook-url">Discord Webhook URL</Label>
      <Input
        id="discord-webhook-url"
        type="url"
        placeholder="https://discord.com/api/webhooks/..."
        value={webhookUrl}
        onChange={(e) => onChange({ ...config, webhookUrl: e.target.value })}
        disabled={disabled}
        required
      />
      {errors?.webhookUrl && (
        <p className="text-xs text-destructive">{errors.webhookUrl}</p>
      )}
      <p className="text-[11px] text-muted-foreground">
        Get this URL from your Discord Server Settings &gt; Integrations &gt;
        Webhooks.
      </p>
    </div>
  );
}

function DiscordConfigSummary({ config }: ChannelConfigSummaryProps) {
  const [showUrl, setShowUrl] = useState(false);

  const rawUrl =
    typeof config.webhookUrl === "string"
      ? config.webhookUrl
      : typeof config.url === "string"
        ? config.url
        : JSON.stringify(config);

  const maskWebhook = (url: string) => {
    if (!url) return "—";
    if (url.length <= 16) return "••••••••••••••••";
    return `${url.slice(0, 10)}••••••••••••${url.slice(-6)}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(rawUrl);
    toast.success("Discord Webhook URL copied to clipboard");
  };

  return (
    <div className="rounded-md bg-muted/60 p-2.5 font-mono text-xs text-muted-foreground flex items-center justify-between gap-2 overflow-hidden border">
      <span className="truncate select-all">
        {showUrl ? rawUrl : maskWebhook(rawUrl)}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setShowUrl((prev) => !prev)}
          title={showUrl ? "Hide URL" : "Show URL"}
        >
          {showUrl ? (
            <EyeOffIcon className="size-3.5" />
          ) : (
            <EyeIcon className="size-3.5" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleCopy}
          title="Copy Webhook URL"
        >
          <CopyIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export const discordChannelType: ChannelTypeDefinition = {
  id: "discord",
  name: "Discord Webhook",
  description: "Send notifications to a Discord channel via Webhook URL",
  icon: MessageSquareIcon,
  defaultConfig: { webhookUrl: "" },
  validate: (config) => {
    const url =
      typeof config.webhookUrl === "string" ? config.webhookUrl.trim() : "";
    if (!url) {
      return "Discord Webhook URL is required";
    }
    try {
      new URL(url);
    } catch {
      return "Please enter a valid URL (e.g., https://discord.com/api/webhooks/...)";
    }
    return null;
  },
  ConfigForm: DiscordConfigForm,
  ConfigSummary: DiscordConfigSummary,
};
