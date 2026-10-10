import type { RiskLevel } from "./result-schema";

export interface AutomaticRiskAlertRecord {
  host: string;
  classification: Exclude<RiskLevel, "low">;
}

export function shouldSendAutomaticRiskAlert(
  host: string,
  classification: RiskLevel,
  previous: unknown
): boolean {
  if (classification === "low") return false;
  if (previous === host) return false;
  if (!isAutomaticRiskAlertRecord(previous) || previous.host !== host) return true;
  return previous.classification === "medium" && classification === "high";
}

function isAutomaticRiskAlertRecord(value: unknown): value is AutomaticRiskAlertRecord {
  if (typeof value !== "object" || value === null || !("host" in value) || !("classification" in value)) {
    return false;
  }
  return typeof value.host === "string" && (value.classification === "medium" || value.classification === "high");
}
