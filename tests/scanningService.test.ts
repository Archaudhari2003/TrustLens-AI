import { describe, expect, it } from "vitest";
import { demoFixtures } from "../extension/shared/demoFixtures";
import { analyzeForms } from "../extension/scanner/form-analyzer";
import { analyzeRedirectTiming } from "../extension/scanner/redirect-analyzer";
import { buildLocalResult } from "../extension/scanner/risk-engine";
import { buildPageResult } from "../extension/scanner/scanningService";
import { analyzeUrl } from "../extension/scanner/url-analyzer";
import type { PageDomMetadata, PageSignals } from "../extension/shared/result-schema";

const safeSignals: PageSignals = {
  protocol: "https:",
  host: "library.example",
  credentialFormCount: 1,
  paymentFieldCount: 0,
  crossDomainCredentialHosts: [],
  externalLinkCount: 4,
  externalResourceHosts: ["static-cdn.example"],
  redirectCount: 0,
  hasUrlCredentials: false,
  isIpAddress: false,
  isPunycode: false
};

describe("local risk assessment", () => {
  it("keeps ordinary same-domain forms and external resources low risk", () => {
    const result = buildLocalResult(safeSignals, "2026-10-10T00:00:00.000Z");
    expect(result.classification).toBe("low");
    expect(result.score).toBe(8);
    expect(result.evidence).toHaveLength(0);
    expect(result.observations.find((item) => item.id === "external-links")?.value).toBe("4 external links");
  });

  it("raises medium risk for a numeric host without treating it as proof of fraud", () => {
    const result = buildLocalResult({ ...safeSignals, host: "192.0.2.4", isIpAddress: true }, "2026-10-10T00:00:00.000Z");
    expect(result.classification).toBe("medium");
    expect(result.evidence[0]?.severity).toBe("medium");
  });

  it("does not treat combined weaker URL signals as a high-risk page", () => {
    const result = buildLocalResult({
      ...safeSignals,
      hasUrlCredentials: true,
      isIpAddress: true,
      isPunycode: true
    }, "2026-10-10T00:00:00.000Z");
    expect(result.score).toBe(64);
    expect(result.classification).toBe("medium");
    expect(result.evidence.every((item) => item.severity === "medium")).toBe(true);
  });

  it("prioritizes cross-domain credential submission and HTTP-sensitive forms", () => {
    const result = buildLocalResult({
      ...safeSignals,
      protocol: "http:",
      crossDomainCredentialHosts: ["auth-desk.example"]
    }, "2026-10-10T00:00:00.000Z");
    expect(result.classification).toBe("high");
    expect(result.score).toBe(100);
    expect(result.evidence[0]?.id).toBe("cross-domain-credential");
    expect(result.observations.find((item) => item.id === "redirects")?.state).toBe("unavailable");
  });

  it("varies the high-risk score by the number of observed risky forms and destinations", () => {
    const oneHttpPasswordForm = buildLocalResult({
      ...safeSignals,
      protocol: "http:"
    }, "2026-10-10T00:00:00.000Z");
    const twoHttpPasswordForms = buildLocalResult({
      ...safeSignals,
      protocol: "http:",
      credentialFormCount: 2
    }, "2026-10-10T00:00:00.000Z");
    const twoCredentialDestinations = buildLocalResult({
      ...safeSignals,
      crossDomainCredentialHosts: ["auth.example", "collect.example"]
    }, "2026-10-10T00:00:00.000Z");

    expect(oneHttpPasswordForm.score).toBe(73);
    expect(twoHttpPasswordForms.score).toBe(78);
    expect(twoCredentialDestinations.score).toBe(83);
    expect(twoCredentialDestinations.evidence[0]?.contribution).toBe(75);
  });

  it("uses the shared local assessment for automatic page detection", () => {
    const page: PageDomMetadata = {
      forms: [{ hasPassword: true, paymentFieldCount: 0, actionHost: "collector.example" }],
      externalLinkCount: 0,
      externalResourceHosts: [],
      redirectCount: 0
    };
    const result = buildPageResult("http://shop.example/login?token=not-retained", page, "2026-10-10T00:00:00.000Z");
    expect(result.classification).toBe("high");
    expect(result.host).toBe("shop.example");
    expect(JSON.stringify(result)).not.toContain("token=not-retained");
  });

  it("provides separate, labeled low, medium, and high demo states", () => {
    expect(demoFixtures.low.classification).toBe("low");
    expect(demoFixtures.medium.classification).toBe("medium");
    expect(demoFixtures.high.classification).toBe("high");
    expect(new Set(Object.values(demoFixtures).map((fixture) => fixture.score)).size).toBe(3);
    expect(demoFixtures.low.score).toBeLessThan(demoFixtures.medium.score);
    expect(demoFixtures.medium.score).toBeLessThan(demoFixtures.high.score);
    expect(demoFixtures.high.score).toBe(100);
    expect(demoFixtures.high.score).toBe(Math.min(100, demoFixtures.high.evidence.reduce((sum, item) => sum + item.contribution, 8)));
    expect(Object.values(demoFixtures).every((fixture) => fixture.source === "demo")).toBe(true);
  });

  it("extracts only URL features and rejects non-web protocols", () => {
    expect(analyzeUrl("https://user:secret@xn--e1afmkfd.example/login?token=hidden")).toEqual({
      protocol: "https:",
      host: "xn--e1afmkfd.example",
      hasUrlCredentials: true,
      isIpAddress: false,
      isPunycode: true
    });
    expect(() => analyzeUrl("chrome://settings")).toThrow();
  });

  it("flags only credential forms with a different HTTP(S) hostname", () => {
    expect(analyzeForms([
      { hasPassword: true, paymentFieldCount: 0, actionHost: "library.example" },
      { hasPassword: true, paymentFieldCount: 0, actionHost: "identity.example" }
    ], "library.example")).toEqual({
      credentialFormCount: 2,
      paymentFieldCount: 0,
      crossDomainCredentialHosts: ["identity.example"]
    });
  });

  it("keeps redirect timing explicitly incomplete", () => {
    expect(analyzeRedirectTiming(0).state).toBe("unavailable");
    expect(analyzeRedirectTiming(0).detail).toContain("cannot establish the complete network redirect chain");
  });

  it("distinguishes observed transport from unverified identity and unchecked certificates", () => {
    const result = buildLocalResult(safeSignals, "2026-10-10T00:00:00.000Z");
    expect(result.observations.find((item) => item.id === "transport")?.state).toBe("observed");
    expect(result.observations.find((item) => item.id === "site-identity")?.state).toBe("unverified");
    expect(result.observations.find((item) => item.id === "certificate-chain")?.state).toBe("not-checked");
  });
});
