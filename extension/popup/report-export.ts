import { jsPDF } from "jspdf";
import type { RiskLevel, ScanResult } from "../shared/result-schema";

const riskLabels: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Review recommended",
  high: "High risk"
};

export function createAssessmentPdf(result: ScanResult): jsPDF {
  const document = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 18;
  const lineHeight = 5;
  const bodyWidth = pageWidth - margin * 2;
  let y = 20;

  function ensureSpace() {
    if (y + lineHeight > pageHeight - margin) {
      document.addPage();
      y = margin;
    }
  }

  function write(text: string, options: { size?: number; color?: [number, number, number]; bold?: boolean; gap?: number } = {}) {
    const { size = 10, color = [38, 52, 70], bold = false, gap = 2 } = options;
    document.setFont("helvetica", bold ? "bold" : "normal");
    document.setFontSize(size);
    document.setTextColor(...color);
    const lines = document.splitTextToSize(text.replace(/[\r\n]+/g, " "), bodyWidth) as string[];
    for (const line of lines) {
      ensureSpace();
      document.text(line, margin, y);
      y += lineHeight;
    }
    y += gap;
  }

  const riskColor: Record<RiskLevel, [number, number, number]> = {
    low: [5, 157, 86],
    medium: [191, 121, 0],
    high: [227, 35, 54]
  };

  write("TrustLens AI", { size: 19, color: [22, 59, 99], bold: true, gap: 1 });
  write("WEBSITE RISK ASSESSMENT", { size: 9, color: [82, 103, 127], bold: true, gap: 4 });
  document.setDrawColor(204, 219, 233);
  document.line(margin, y, pageWidth - margin, y);
  y += 8;

  write(result.source === "demo" ? "DEMO EXAMPLE - NOT A LIVE WEBSITE SCAN" : "WEBSITE", {
    size: 8,
    color: [82, 103, 127],
    bold: true,
    gap: 2
  });
  write(result.host, { size: 15, color: [23, 43, 69], bold: true, gap: 3 });
  write(`${riskLabels[result.classification]} - ${result.score}/100`, {
    size: 13,
    color: riskColor[result.classification],
    bold: true,
    gap: 2
  });
  write(`Scanned: ${new Date(result.scannedAt).toLocaleString()}`, { size: 9, color: [82, 103, 127], gap: 4 });
  write("Assessment summary", { size: 11, color: [22, 59, 99], bold: true });
  write(result.summary);
  write("Recommended action", { size: 11, color: [22, 59, 99], bold: true });
  write(result.recommendation, { gap: 4 });

  write("Security evidence", { size: 11, color: [22, 59, 99], bold: true });
  if (result.evidence.length === 0) {
    write("No strong risk indicators were found in the available checks.");
  } else {
    for (const item of result.evidence) {
      write(`${item.title} (${item.severity} risk, +${item.contribution})`, { size: 10, bold: true, gap: 1 });
      write(item.summary, { size: 9, gap: 1 });
      write(`Technical detail: ${item.technicalDetail}`, { size: 8, color: [82, 103, 127], gap: 3 });
    }
  }

  write("Page observations", { size: 11, color: [22, 59, 99], bold: true });
  for (const observation of result.observations) {
    write(`${observation.label}: ${observation.value} (${observation.state})`, { size: 9, bold: true, gap: 1 });
    write(observation.detail, { size: 8, color: [82, 103, 127], gap: 3 });
  }

  y += 2;
  write("A low-risk result is not a guarantee of safety. This local assessment does not verify site ownership, reputation, or certificate-chain details.", {
    size: 8,
    color: [82, 103, 127],
    gap: 0
  });

  return document;
}

export function downloadAssessmentPdf(result: ScanResult): void {
  const host = result.host.replace(/[^a-z0-9.-]+/gi, "-").replace(/^-+|-+$/g, "") || "website";
  const date = result.scannedAt.slice(0, 10);
  createAssessmentPdf(result).save(`trustlens-${host}-${date}.pdf`);
}
