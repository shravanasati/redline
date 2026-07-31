"use client";

import { CopyIcon, MailIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ChannelConfigFormProps,
  ChannelConfigSummaryProps,
  ChannelTypeDefinition,
} from "./types";

function EmailConfigForm({
  config,
  onChange,
  disabled,
  errors,
}: ChannelConfigFormProps) {
  const email = typeof config.email === "string" ? config.email : "";

  return (
    <div className="space-y-2">
      <Label htmlFor="email-address">Recipient Email Address</Label>
      <Input
        id="email-address"
        type="email"
        placeholder="e.g. devops@example.com"
        value={email}
        onChange={(e) => onChange({ ...config, email: e.target.value })}
        disabled={disabled}
        required
      />
      {errors?.email && (
        <p className="text-xs text-destructive">{errors.email}</p>
      )}
      <p className="text-[11px] text-muted-foreground">
        Alert notifications will be sent directly to this email address.
      </p>
    </div>
  );
}

function EmailConfigSummary({ config }: ChannelConfigSummaryProps) {
  const email = typeof config.email === "string" ? config.email : "—";

  const handleCopy = () => {
    if (email && email !== "—") {
      navigator.clipboard.writeText(email);
      toast.success("Email address copied to clipboard");
    }
  };

  return (
    <div className="rounded-md bg-muted/60 p-2.5 font-mono text-xs text-muted-foreground flex items-center justify-between gap-2 overflow-hidden border">
      <div className="flex items-center gap-2 truncate">
        <MailIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate select-all">{email}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={handleCopy}
        title="Copy Email Address"
      >
        <CopyIcon className="size-3.5" />
      </Button>
    </div>
  );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailChannelType: ChannelTypeDefinition = {
  id: "email",
  name: "Email",
  description: "Send instant alert emails to any email address",
  icon: MailIcon,
  defaultConfig: { email: "" },
  validate: (config) => {
    const email = typeof config.email === "string" ? config.email.trim() : "";
    if (!email) {
      return "Email address is required";
    }
    if (!EMAIL_REGEX.test(email)) {
      return "Please enter a valid email address";
    }
    return null;
  },
  ConfigForm: EmailConfigForm,
  ConfigSummary: EmailConfigSummary,
};
