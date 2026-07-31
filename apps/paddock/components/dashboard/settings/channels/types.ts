import type React from "react";

export interface ChannelConfigFormProps {
  config: Record<string, unknown>;
  onChange: (updatedConfig: Record<string, unknown>) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
}

export interface ChannelConfigSummaryProps {
  config: Record<string, unknown>;
}

export interface ChannelTypeDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultConfig: Record<string, unknown>;

  /**
   * Validate the configuration form values.
   * Returns null if valid, or an error message string / field error map.
   */
  validate: (config: Record<string, unknown>) => string | null;

  /**
   * Render the custom config form fields for creating / editing.
   */
  ConfigForm: React.ComponentType<ChannelConfigFormProps>;

  /**
   * Render the channel config summary on the card.
   */
  ConfigSummary: React.ComponentType<ChannelConfigSummaryProps>;
}
