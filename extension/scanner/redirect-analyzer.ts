import type { PageObservation } from "../shared/result-schema";

export function analyzeRedirectTiming(count: number | null): PageObservation {
  return {
    id: "redirects",
    label: "Navigation redirect timing",
    value: count === null ? "Unavailable" : `${count} reported`,
    state: "unavailable",
    detail: "Browser timing data may omit cross-origin redirects and cannot establish the complete network redirect chain."
  };
}
