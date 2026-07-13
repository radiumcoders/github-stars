"use client";

import { useCallback, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  targetId: string;
}

export function ExportButton({ targetId }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    const element = document.getElementById(targetId);
    if (!element) return;

    setIsExporting(true);
    try {
      const RecordRTC = (await import("recordrtc")).default;

      if (typeof navigator.mediaDevices?.getDisplayMedia === "function") {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        } as DisplayMediaStreamOptions);

        const recorder = new RecordRTC(stream, {
          type: "video",
          mimeType: "video/webm;codecs=vp9",
        });

        recorder.startRecording();
        await new Promise((r) => setTimeout(r, 5000));
        recorder.stopRecording(() => {
          const blob = recorder.getBlob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "stargazer-wall.webm";
          a.click();
          URL.revokeObjectURL(url);
          stream.getTracks().forEach((t) => t.stop());
        });
        return;
      }

      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(element, {
        backgroundColor: "#09090b",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "stargazer-wall.png";
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch {
      // User cancelled picker or export unavailable
    } finally {
      setIsExporting(false);
    }
  }, [targetId]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      aria-label="Export animation as WebM video or PNG snapshot"
    >
      {isExporting ? (
        <Loader2 data-icon="inline-start" className="animate-spin" />
      ) : (
        <Download data-icon="inline-start" />
      )}
      {isExporting ? "Exporting…" : "Export"}
    </Button>
  );
}