import type { PageObservation, PageSignals, RiskIndicator, ScanResult } from "../shared/result-schema";
import { analyzeRedirectTiming } from "./redirect-analyzer";
import { BASELINE_RISK_SCORE, HIGH_RISK_THRESHOLD, MEDIUM_RISK_THRESHOLD } from "../shared/constants";

export function buildLocalResult(signals: PageSignals, scannedAt: string): ScanResult {
  const evidence: RiskIndicator[] = [];
  if (signals.crossDomainCredentialHosts.length) {
    const crossDomainContribution = Math.min(85, 55 + Math.min(signals.crossDomainCredentialHosts.length, 3) * 10);
    evidence.push({
      id: "cross-domain-credential",
      title: "Password form sends to another domain",
      summary: "A credential form points to a different hostname.",
      technicalDetail: `The observed form destination is ${signals.crossDomainCredentialHosts.join(", ")}. Field values and private form contents were not read.`,
      severity: "high",
      contribution: crossDomainContribution
    });
  }
  if ((signals.credentialFormCount > 0 || signals.paymentFieldCount > 0) && signals.protocol !== "https:") {
    const sensitiveFieldCount = signals.credentialFormCount + signals.paymentFieldCount;
    const httpSensitiveContribution = Math.min(85, 60 + Math.min(sensitiveFieldCount, 5) * 5);
    evidence.push({
      id: "http-sensitive-form",
      title: "Sensitive form is served over HTTP",
      summary: "A password or payment field was observed without HTTPS.",
      technicalDetail: "The page uses plain HTTP. Sensitive information entered here may be exposed in transit; no field values were accessed.",
      severity: "high",
      contribution: httpSensitiveContribution
    });
  }
  if (signals.hasUrlCredentials) {
    evidence.push({
      id: "url-credentials",
      title: "Address contains embedded credentials",
      summary: "The URL includes a username or password section.",
      technicalDetail: "Credentials embedded in an address are unusual and can be misleading. The actual credential text was not retained.",
      severity: "medium",
      contribution: 35
    });
  }
  if (signals.isIpAddress) {
    evidence.push({
      id: "numeric-host",
      title: "Address uses a numeric host",
      summary: "The site is addressed by an IP rather than a domain name.",
      technicalDetail: "Numeric hosts can be legitimate, but make an organisation's domain identity harder to verify. This signal alone does not prove fraud.",
      severity: "medium",
      contribution: 40
    });
  }
  if (signals.isPunycode) {
    evidence.push({
      id: "punycode-host",
      title: "Address contains an internationalized hostname",
      summary: "A hostname label uses a punycode representation.",
      technicalDetail: "Internationalized names can be legitimate, but visually similar characters may be used to imitate another domain. Verify the spelling carefully.",
      severity: "medium",
      contribution: 35
    });
  }

  const hasHighSeverityEvidence = evidence.some((item) => item.severity === "high");
  const maximumScore = hasHighSeverityEvidence ? 100 : HIGH_RISK_THRESHOLD - 1;
  const score = Math.min(maximumScore, evidence.reduce((total, item) => total + item.contribution, BASELINE_RISK_SCORE));
  const classification = score >= HIGH_RISK_THRESHOLD ? "high" : score >= MEDIUM_RISK_THRESHOLD ? "medium" : "low";
  const observations: PageObservation[] = [
    {
      id: "url-features",
      label: "URL and hostname features",
      value: [
        signals.isIpAddress ? "Numeric host" : "",
        signals.isPunycode ? "Internationalized hostname" : "",
        signals.hasUrlCredentials ? "Embedded URL credentials" : ""
      ].filter(Boolean).join(" · ") || "No standout structure observed",
      state: "observed",
      detail: "Only address structure was checked. The URL path and query are not retained, and this does not check reputation or ownership."
    },
    {
      id: "transport",
      label: "Transport security",
      value: signals.protocol === "https:" ? "HTTPS" : "HTTP",
      state: "observed",
      detail: signals.protocol === "https:"
        ? "The page was served over HTTPS. This does not verify the site's identity or certificate chain."
        : "The page was served over plain HTTP. Certificate-chain details are not applicable."
    },
    {
      id: "site-identity",
      label: "Site ownership and reputation",
      value: "Not verified",
      state: "unverified",
      detail: "No ownership or reputation lookup was performed. HTTPS encrypts transport but does not prove that a site is legitimate."
    },
    {
      id: "certificate-chain",
      label: "Certificate chain",
      value: "Not inspected",
      state: "not-checked",
      detail: "This scanner does not inspect certificate-chain details."
    },
    {
      id: "credentials",
      label: "Sensitive fields",
      value: `${signals.credentialFormCount} password form${signals.credentialFormCount === 1 ? "" : "s"} · ${signals.paymentFieldCount} payment field${signals.paymentFieldCount === 1 ? "" : "s"}`,
      state: "observed",
      detail: "Only field types and autocomplete metadata were counted. Values and private form contents were not read."
    },
    {
      id: "form-destination",
      label: "Cross-domain credential forms",
      value: signals.crossDomainCredentialHosts.length
        ? signals.crossDomainCredentialHosts.join(", ")
        : signals.credentialFormCount ? "None observed" : "No password form found",
      state: signals.credentialFormCount ? "observed" : "not-observed",
      detail: "A same-domain form is not inherently safe; this check only reports whether its destination hostname differs."
    },
    {
      id: "external-links",
      label: "External links",
      value: `${signals.externalLinkCount} external link${signals.externalLinkCount === 1 ? "" : "s"}`,
      state: "observed",
      detail: "External links are common and are not considered malicious on their own."
    },
    {
      id: "external-resources",
      label: "External resources",
      value: `${signals.externalResourceHosts.length} host${signals.externalResourceHosts.length === 1 ? "" : "s"}`,
      state: "observed",
      detail: signals.externalResourceHosts.length
        ? `Observed resource hosts: ${signals.externalResourceHosts.join(", ")}.`
        : "No external resource hosts were observed."
    },
    analyzeRedirectTiming(signals.redirectCount)
  ];

  return {
    host: signals.host,
    scannedAt,
    source: "local",
    score,
    classification,
    summary: classification === "high"
      ? "Strong risk indicators were found in observable page metadata."
      : classification === "medium"
        ? "One or more signals merit a closer look before you continue."
        : "No strong risk indicators were found in the checks available to this local scan.",
    recommendation: classification === "high"
      ? "Avoid entering passwords or payment details until you verify the address through a trusted channel."
      : classification === "medium"
        ? "Check the full address and verify the site through a trusted bookmark or official app."
        : "Continue to check the address before sharing sensitive information. A low score is not a guarantee of safety.",
    evidence,
    observations
  };
}
