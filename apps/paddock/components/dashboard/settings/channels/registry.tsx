import { BellIcon } from "lucide-react";
import { discordChannelType } from "./discord";
import { emailChannelType } from "./email";
import type {
  ChannelConfigFormProps,
  ChannelConfigSummaryProps,
  ChannelTypeDefinition,
} from "./types";

/**
 * Generic Fallback Summary for unregistered / custom channel types
 */
function GenericConfigSummary({ config }: ChannelConfigSummaryProps) {
  return (
    <div className="rounded-md bg-muted/60 p-2.5 font-mono text-xs text-muted-foreground truncate border">
      {JSON.stringify(config)}
    </div>
  );
}

/**
 * Generic Fallback Form for unregistered / custom channel types
 */
function GenericConfigForm({
  config,
  onChange,
  disabled,
}: ChannelConfigFormProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Config (JSON)</label>
      <textarea
        className="w-full rounded-md border bg-transparent p-2 text-xs font-mono"
        rows={4}
        value={JSON.stringify(config, null, 2)}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {}
        }}
        disabled={disabled}
      />
    </div>
  );
}

const genericChannelType: ChannelTypeDefinition = {
  id: "generic",
  name: "Custom Webhook",
  description: "Generic HTTP Webhook notification channel",
  icon: BellIcon,
  defaultConfig: {},
  validate: (config) =>
    Object.keys(config).length > 0 ? null : "Config object cannot be empty",
  ConfigForm: GenericConfigForm,
  ConfigSummary: GenericConfigSummary,
};

export const channelTypeRegistry: Record<string, ChannelTypeDefinition> = {
  discord: discordChannelType,
  email: emailChannelType,
};

export function getChannelType(typeId: string): ChannelTypeDefinition {
  return (
    channelTypeRegistry[typeId] || {
      ...genericChannelType,
      id: typeId,
      name: typeId.charAt(0).toUpperCase() + typeId.slice(1),
    }
  );
}

export function getAllChannelTypes(): ChannelTypeDefinition[] {
  return Object.values(channelTypeRegistry);
}
