import { MAX_SCAN_HISTORY } from "../shared/constants";
import type { ScanHistoryEntry, ScanResult, UserSettings } from "../shared/result-schema";

const SETTINGS_KEY = "trustlens.settings";
const HISTORY_KEY = "trustlens.history";
export const defaultSettings: UserSettings = {
  showRiskWarnings: true,
  saveScanHistory: true,
  scanAlerts: true,
  autoDetectBadSites: true,
  beepAlerts: true,
  theme: "light"
};

function inExtension(): boolean {
  return Boolean(globalThis.chrome?.storage?.local);
}

export async function loadSettings(): Promise<UserSettings> {
  if (inExtension()) {
    const stored = await chrome.storage.local.get(SETTINGS_KEY);
    return { ...defaultSettings, ...(stored[SETTINGS_KEY] as Partial<UserSettings> | undefined) };
  }
  try {
    const value = localStorage.getItem(SETTINGS_KEY);
    return value ? { ...defaultSettings, ...(JSON.parse(value) as Partial<UserSettings>) } : defaultSettings;
  } catch (error) {
    throw new Error("Saved settings could not be read.", { cause: error });
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  if (inExtension()) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
    return;
  }
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    throw new Error("Settings could not be saved in this browser.", { cause: error });
  }
}

export async function loadHistory(): Promise<ScanHistoryEntry[]> {
  if (inExtension()) {
    const stored = await chrome.storage.local.get(HISTORY_KEY);
    return (stored[HISTORY_KEY] as ScanHistoryEntry[] | undefined) ?? [];
  }
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as ScanHistoryEntry[];
  } catch (error) {
    throw new Error("Scan history could not be read.", { cause: error });
  }
}

export async function saveHistory(result: ScanResult): Promise<void> {
  const previous = await loadHistory();
  const entry: ScanHistoryEntry = {
    host: result.host,
    scannedAt: result.scannedAt,
    classification: result.classification,
    score: result.score,
    source: result.source
  };
  const history = [entry, ...previous.filter((item) => item.host !== entry.host)].slice(0, MAX_SCAN_HISTORY);
  if (inExtension()) {
    await chrome.storage.local.set({ [HISTORY_KEY]: history });
    return;
  }
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    throw new Error("Scan history could not be saved in this browser.", { cause: error });
  }
}
