/** Data contracts shared by the popup, local scanner, and future API adapter. */
export type RiskLevel = "low" | "medium" | "high";
export type FindingSeverity = "low" | "medium" | "high";
export type ObservationState = "observed" | "not-observed" | "unavailable" | "unverified" | "not-checked";
export type ScanSource = "local" | "remote" | "demo";
export type Screen = "popup" | "report" | "analysis" | "trust" | "history" | "settings";

export interface RiskIndicator {
  id: string;
  title: string;
  summary: string;
  technicalDetail: string;
  severity: FindingSeverity;
  contribution: number;
}

export interface PageObservation {
  id: string;
  label: string;
  value: string;
  state: ObservationState;
  detail: string;
}

export interface ScanResult {
  host: string;
  scannedAt: string;
  source: ScanSource;
  score: number;
  classification: RiskLevel;
  summary: string;
  recommendation: string;
  evidence: RiskIndicator[];
  observations: PageObservation[];
}

export interface ScanRequest {
  url: string;
  demoFixtureId?: string;
}

export interface TrustProfileChange {
  domain: string;
  previousAssessment: RiskLevel;
  currentAssessment: RiskLevel;
  previousScore: number;
  currentScore: number;
  lastObserved: string;
  changedIndicators: string[];
  timeline: Array<{ date: string; title: string; detail: string }>;
  isDemo: true;
}

export interface ScanHistoryEntry {
  host: string;
  scannedAt: string;
  classification: RiskLevel;
  score: number;
  source: ScanSource;
}

export interface UserSettings {
  showRiskWarnings: boolean;
  saveScanHistory: boolean;
  scanAlerts: boolean;
  autoDetectBadSites: boolean;
  beepAlerts: boolean;
  theme: "light" | "dark" | "system";
}

export interface PageSignals {
  protocol: string;
  host: string;
  credentialFormCount: number;
  paymentFieldCount: number;
  crossDomainCredentialHosts: string[];
  externalLinkCount: number;
  externalResourceHosts: string[];
  redirectCount: number | null;
  hasUrlCredentials: boolean;
  isIpAddress: boolean;
  isPunycode: boolean;
}

export interface FormMetadata {
  hasPassword: boolean;
  paymentFieldCount: number;
  actionHost: string;
}

export interface PageDomMetadata {
  forms: FormMetadata[];
  externalLinkCount: number;
  externalResourceHosts: string[];
  redirectCount: number | null;
}

export interface UrlSignals {
  protocol: "http:" | "https:";
  host: string;
  hasUrlCredentials: boolean;
  isIpAddress: boolean;
  isPunycode: boolean;
}
