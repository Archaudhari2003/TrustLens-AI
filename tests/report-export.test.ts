import { describe, expect, it } from "vitest";
import { createAssessmentPdf } from "../extension/popup/report-export";
import { demoFixtures } from "../extension/shared/demoFixtures";

describe("PDF assessment export", () => {
  it("creates a PDF containing the assessment document", () => {
    const pdf = createAssessmentPdf(demoFixtures.high);
    const bytes = new Uint8Array(pdf.output("arraybuffer"));

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
    expect(pdf.getNumberOfPages()).toBeGreaterThan(0);
  });

  it("paginates long observation reports", () => {
    const result = {
      ...demoFixtures.high,
      observations: Array.from({ length: 80 }, (_, index) => ({
        id: `observation-${index}`,
        label: `Page observation ${index}`,
        value: "Observed page metadata",
        state: "observed" as const,
        detail: "A detailed explanation of the metadata that was locally inspected."
      }))
    };

    expect(createAssessmentPdf(result).getNumberOfPages()).toBeGreaterThan(1);
  });
});
