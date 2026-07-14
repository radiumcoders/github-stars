import { GenerateButton } from "@/app/generate-button";
import { Card } from "@/components/ui/card";
import type { ExportConfig } from "@/lib/export-config";
import { cn } from "@/lib/utils";
import { presets, type PresetId } from "@/video/presets";
import { Props } from "@/video/schema";
import { ReactNode } from "react";

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
    onTextColorChange;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="w-full">
        <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Preview
          </span>
          {inputProps && (
            <span className="font-mono text-[11px] text-muted-foreground">
              {inputProps.user}/{inputProps.repository}
            </span>
          )}
        </div>
        <div className="border border-border bg-background p-px">
          <Card
            className={cn(
              className,
              "aspect-video size-full overflow-hidden border-0 bg-white text-black",
            )}
          >
            {children}
          </Card>
        </div>
      </div>

      {hasCustomizer && (
        <div className="border border-border">
          <div className="border-b border-border px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Customize
          </div>
          <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            <Field label="Preset">
              <select
                value={preset}
                onChange={(e) => onPresetChange(e.target.value as PresetId)}
                className="h-9 w-full cursor-pointer border border-border bg-background px-2 font-mono text-[11px] uppercase tracking-wider text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <ColorField
              label="Background"
              value={primaryColor}
              onChange={onPrimaryColorChange}
            />
            <ColorField
              label="Fluid"
              value={shaderColor}
              onChange={onShaderColorChange}
            />
            <ColorField
              label="Text"
              value={textColor}
              onChange={onTextColorChange}
            />
          </div>
        </div>
      )}

      {inputProps && (
        <GenerateButton inputProps={inputProps} exportConfig={exportConfig} />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (color: string) => void;
}) {
  return (
    <Field label={label}>
      <span className="flex h-9 cursor-pointer items-center gap-2 border border-border bg-background px-2 focus-within:ring-1 focus-within:ring-ring">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-5 shrink-0 cursor-pointer appearance-none border border-border bg-transparent p-0"
        />
        <span className="font-mono text-[11px] uppercase text-muted-foreground">
          {value}
        </span>
      </span>
    </Field>
  );
}
