import type { ScanResult, TrustProfileChange } from "./result-schema";

export const demoFixtures: Record<string, ScanResult> = {
  low: {
    host: "northstar-library.example",
    scannedAt: "2026-10-10T04:50:00.000Z",
    source: "demo",
    score: 8,
    classification: "low",
    summary: "No strong risk indicators were found in this demo assessment.",
    recommendation: "Continue to check the address before sharing sensitive information.",
    evidence: [],
    observations: [
      { id: "url-features", label: "URL and hostname features", value: "No standout structure observed", state: "observed", detail: "Only address structure was checked. The URL path and query are not retained, and this does not check reputation or ownership." },
      { id: "transport", label: "Transport", value: "HTTPS", state: "observed", detail: "The page was served over HTTPS. This does not verify the site's identity or certificate chain." },
      { id: "site-identity", label: "Site ownership and reputation", value: "Not verified", state: "unverified", detail: "No ownership or reputation lookup was performed. HTTPS encrypts transport but does not prove that a site is legitimate." },
      { id: "certificate-chain", label: "Certificate chain", value: "Not inspected", state: "not-checked", detail: "This scanner does not inspect certificate-chain details." },
      { id: "credentials", label: "Credential forms", value: "1 same-domain form", state: "observed", detail: "A password field was counted. Field values and other private form contents were not read." },
      { id: "form-destination", label: "Cross-domain credential forms", value: "None observed", state: "observed", detail: "A same-domain form is not inherently safe; this check only reports whether its destination hostname differs." },
      { id: "external-links", label: "External links", value: "3 external links", state: "observed", detail: "External links are common and are not considered malicious on their own." },
      { id: "external-resources", label: "External resources", value: "2 hosts", state: "observed", detail: "Observed resource hosts: assets.example, images.example." },
      { id: "redirects", label: "Redirect timing", value: "Not fully observable", state: "unavailable", detail: "Browser timing data cannot establish the complete network redirect chain." }
    ]
  },
  medium: {
    host: "192.0.2.4",
    scannedAt: "2026-10-10T04:48:00.000Z",
    source: "demo",
    score: 48,
    classification: "medium",
    summary: "A suspicious URL pattern needs a closer look before you continue.",
    recommendation: "Verify the address through a trusted bookmark or the organisation's official app.",
    evidence: [
      {
        id: "numeric-host",
        title: "Address uses a numeric host",
        summary: "The site address points directly to an IP address.",
        technicalDetail: "Numeric hosts can be legitimate, but they make an organisation's domain identity harder to verify. This signal alone does not prove fraud.",
        severity: "medium",
        contribution: 40
      }
    ],
    observations: [
      { id: "url-features", label: "URL and hostname features", value: "Numeric host", state: "observed", detail: "Only address structure was checked. Numeric hosts can be legitimate but make domain identity harder to verify." },
      { id: "transport", label: "Transport", value: "HTTPS", state: "observed", detail: "The page was served over HTTPS. Certificate-chain details were not inspected." },
      { id: "site-identity", label: "Site ownership and reputation", value: "Not verified", state: "unverified", detail: "No ownership or reputation lookup was performed. HTTPS encrypts transport but does not prove that a site is legitimate." },
      { id: "certificate-chain", label: "Certificate chain", value: "Not inspected", state: "not-checked", detail: "This scanner does not inspect certificate-chain details." },
      { id: "credentials", label: "Credential forms", value: "1 same-domain form", state: "observed", detail: "A password field was counted. Its value was never read." },
      { id: "form-destination", label: "Cross-domain credential forms", value: "None observed", state: "observed", detail: "A same-domain form is not inherently safe; this check only reports whether its destination hostname differs." },
      { id: "external-links", label: "External links", value: "2 external links", state: "observed", detail: "No risk is assigned to external links solely because they leave this domain." },
      { id: "external-resources", label: "External resources", value: "1 host", state: "observed", detail: "Observed resource host: static.example." },
      { id: "redirects", label: "Redirect timing", value: "Not fully observable", state: "unavailable", detail: "Browser timing data cannot establish the complete network redirect chain." }
    ]
  },
  high: {
    host: "secure-account-check.example",
    scannedAt: "2026-10-10T04:44:00.000Z",
    source: "demo",
    score: 100,
    classification: "high",
    summary: "Credential and transport signals strongly suggest that this page is unsafe for sensitive information.",
    recommendation: "Do not enter passwords or payment details. Close this page and reach the service using a known-good address.",
    evidence: [
      {
        id: "cross-domain-credential",
        title: "Password form sends to another domain",
        summary: "Credentials appear to be submitted to an unfamiliar host.",
        technicalDetail: "The form action hostname differs from the page hostname. Only the field type and destination hostname were inspected; values and form contents were not accessed.",
        severity: "high",
        contribution: 65
      },
      {
        id: "http-sensitive-form",
        title: "Sensitive form is served over HTTP",
        summary: "The page does not use HTTPS for a password or payment field.",
        technicalDetail: "Without HTTPS, data sent by the page may be exposed in transit. The browser's certificate chain was not inspected.",
        severity: "high",
        contribution: 70
      }
    ],
    observations: [
      { id: "url-features", label: "URL and hostname features", value: "No standout structure observed", state: "observed", detail: "Only address structure was checked. The URL path and query are not retained, and this does not check reputation or ownership." },
      { id: "transport", label: "Transport", value: "HTTP", state: "observed", detail: "This page uses plain HTTP, not an encrypted HTTPS connection." },
      { id: "site-identity", label: "Site ownership and reputation", value: "Not verified", state: "unverified", detail: "No ownership or reputation lookup was performed." },
      { id: "certificate-chain", label: "Certificate chain", value: "Not inspected", state: "not-checked", detail: "This scanner does not inspect certificate-chain details." },
      { id: "credentials", label: "Credential forms", value: "1 password field", state: "observed", detail: "A password input was counted. Its value and surrounding private form contents were never read." },
      { id: "form-destination", label: "Cross-domain credential forms", value: "login-desk.example", state: "observed", detail: "The credential form action points to a different hostname." },
      { id: "external-links", label: "External links", value: "4 external links", state: "observed", detail: "External links alone are not treated as malicious." },
      { id: "external-resources", label: "External resources", value: "4 hosts", state: "observed", detail: "Hostnames were counted; external resources are not treated as malicious without additional evidence." },
      { id: "redirects", label: "Redirect timing", value: "Not fully observable", state: "unavailable", detail: "Browser timing data cannot establish the complete network redirect chain." }
    ]
  }
};

export const trustChangeDemo: TrustProfileChange = {
  domain: "northstar-library.example",
  previousAssessment: "low",
  currentAssessment: "high",
  previousScore: 9,
  currentScore: 78,
  lastObserved: "2026-10-09T16:20:00.000Z",
  changedIndicators: [
    "A credential form now submits to login-desk.example",
    "The password page is now served over HTTP"
  ],
  timeline: [
    { date: "Oct 09, 2026 · 4:20 PM", title: "Credential destination changed", detail: "A password form points to a hostname not present in the demo baseline." },
    { date: "Oct 09, 2026 · 4:18 PM", title: "Transport changed", detail: "The example page was observed over HTTP rather than HTTPS." },
    { date: "Oct 01, 2026 · 9:05 AM", title: "Previous baseline recorded", detail: "Low-risk demo assessment · score 9." }
  ],
  isDemo: true
};
