"use client";

import { GenerateButton } from "@/app/generate-button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ExportConfig } from "@/lib/export-config";
import { cn } from "@/lib/utils";
import { presets, type PresetId } from "@/video/presets";
import { Props } from "@/video/schema";
import { ReactNode } from "react";

const presetShortLabels: Record<PresetId, string> = {
  generic: "Generic",
  confetti: "Confetti",
  editorial: "Editorial",
  aurora: "Aurora",
};

export function ResultCard({
  children,
  className,
  inputProps,
  exportConfig,
  preset,
  onPresetChange,
  primaryColor,
  onPrimaryColorChange,
  shaderColor,
  onShaderColorChange,
  textColor,
  onTextColorChange,
}: {
  children?: ReactNode;
  className?: string;
  inputProps?: Partial<Props>;
  exportConfig: ExportConfig;
  preset?: PresetId;
  onPresetChange?: (preset: PresetId) => void;
  primaryColor?: string;
  onPrimaryColorChange?: (color: string) => void;
  shaderColor?: string;
  onShaderColorChange?: (color: string) => void;
  textColor?: string;
  onTextColorChange?: (color: string) => void;
}) {
  const hasCustomizer =
    onPresetChange &&
    onPrimaryColorChange &&
    onShaderColorChange &&
    onTextColorChange &&
    Boolean(inputProps);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("relative min-h-[22rem] min-w-0 flex-1 bg-background lg:min-h-0", className)}>
        <div className="absolute inset-0 flex overflow-hidden">{children}</div>
      </div>

      {hasCustomizer ? (
        <div className="shrink-0 border-t border-border px-4 py-3">
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel>Preset</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={preset}
                aria-label="Preset"
                onValueChange={(value) => {
                  if (value) onPresetChange(value as PresetId);
                }}
                className="flex flex-wrap justify-start"
              >
                {presets.map((item) => (
                  <ToggleGroupItem key={item.id} value={item.id}>
                    {presetShortLabels[item.id]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <ColorField
                label="Background"
                value={primaryColor ?? "#ffffff"}
                onChange={onPrimaryColorChange}
              />
              <ColorField
                label="Fluid"
                value={shaderColor ?? "#ffffff"}
                onChange={onShaderColorChange}
              />
              <ColorField
                label="Text"
                value={textColor ?? "#111827"}
                onChange={onTextColorChange}
              />
            </div>
            <GenerateButton inputProps={inputProps} exportConfig={exportConfig} />
          </FieldGroup>
        </div>
      ) : null}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange?: (color: string) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <span className="flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-border bg-background px-2 focus-within:ring-1 focus-within:ring-ring">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          aria-label={label}
          className="size-5 shrink-0 cursor-pointer appearance-none border border-border bg-transparent p-0"
        />
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {value}
        </span>
      </span>
    </Field>
  );
}
