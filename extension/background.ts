import type { PageDomMetadata, RiskLevel, UserSettings } from "./shared/result-schema";
import { shouldSendAutomaticRiskAlert } from "./shared/automatic-risk-alert";
import { inspectPage } from "./scanner/dom-analyzer";
import { buildPageResult } from "./scanner/scanningService";

const SETTINGS_KEY = "trustlens.settings";
const ALERT_PREFIX = "trustlens.auto-alert.";
const DEFAULTS: Pick<UserSettings, "autoDetectBadSites" | "beepAlerts"> = {
  autoDetectBadSites: true,
  beepAlerts: true
};
let offscreenCreation: Promise<void> | undefined;

async function getDetectionSettings(): Promise<typeof DEFAULTS> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  const settings = stored[SETTINGS_KEY] as Partial<UserSettings> | undefined;
  return {
    autoDetectBadSites: settings?.autoDetectBadSites ?? DEFAULTS.autoDetectBadSites,
    beepAlerts: settings?.beepAlerts ?? DEFAULTS.beepAlerts
  };
}

async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) return;
  if (!offscreenCreation) {
    offscreenCreation = chrome.offscreen.createDocument({
      url: "extension/offscreen.html",
      reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: "Play the enabled alert sound when local detection identifies a high-risk page."
    }).finally(() => {
      offscreenCreation = undefined;
    });
  }
  await offscreenCreation;
}

async function notifyRisk(tabId: number, host: string, classification: Exclude<RiskLevel, "low">, beepAlerts: boolean): Promise<void> {
  const isHighRisk = classification === "high";
  try {
    await chrome.notifications.create(`trustlens-${classification}-risk-${tabId}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/trustlens.svg"),
      title: `TrustLens detected a ${classification}-risk page`,
      message: isHighRisk
        ? `${host} has strong risk indicators. Avoid entering passwords or payment details until verified.`
        : `${host} has signals that merit caution. Verify the address before sharing sensitive information.`,
      priority: isHighRisk ? 2 : 1
    });
  } catch (error) {
    console.error(`TrustLens could not show a ${classification}-risk notification for ${host}.`, error);
  }
  if (beepAlerts && isHighRisk) {
    try {
      await ensureOffscreenDocument();
      await chrome.runtime.sendMessage({ type: "trustlens.play-risk-alert" });
    } catch (error) {
      console.error(`TrustLens could not play the high-risk alert for ${host}.`, error);
    }
  }
}

async function inspectTab(tabId: number, address: string): Promise<void> {
  const settings = await getDetectionSettings();
  if (!settings.autoDetectBadSites) return;

  let pageUrl: URL;
  try {
    pageUrl = new URL(address);
  } catch {
    return;
  }
  if (pageUrl.protocol !== "http:" && pageUrl.protocol !== "https:") return;

  try {
    const [execution] = await chrome.scripting.executeScript({
      target: { tabId },
      func: inspectPage
    });
    const metadata = execution?.result as PageDomMetadata | undefined;
    if (!metadata) return;

    const result = buildPageResult(address, metadata);
    if (result.classification === "low") return;
    const currentSettings = await getDetectionSettings();
    if (!currentSettings.autoDetectBadSites) return;

    const alertKey = `${ALERT_PREFIX}${tabId}`;
    const alerted = await chrome.storage.session.get(alertKey);
    if (!shouldSendAutomaticRiskAlert(result.host, result.classification, alerted[alertKey])) return;
    await chrome.storage.session.set({
      [alertKey]: { host: result.host, classification: result.classification }
    });
    await notifyRisk(tabId, result.host, result.classification, currentSettings.beepAlerts);
  } catch (error) {
    console.error(`Automatic TrustLens inspection failed for tab ${tabId}.`, error);
  }
}

function inspectCompletedTab(tabId: number, url?: string): void {
  if (url) void inspectTab(tabId, url);
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading") {
    void chrome.storage.session.remove(`${ALERT_PREFIX}${tabId}`);
  }
  if (changeInfo.status === "complete") inspectCompletedTab(tabId, tab.url);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.remove(`${ALERT_PREFIX}${tabId}`);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[SETTINGS_KEY]) return;
  const settings = changes[SETTINGS_KEY].newValue as Partial<UserSettings> | undefined;
  const previousSettings = changes[SETTINGS_KEY].oldValue as Partial<UserSettings> | undefined;
  if (settings?.autoDetectBadSites && !previousSettings?.autoDetectBadSites) void inspectOpenTabs();
});

async function inspectOpenTabs(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ status: "complete" });
    for (const tab of tabs) {
      if (typeof tab.id === "number") inspectCompletedTab(tab.id, tab.url);
    }
  } catch (error) {
    console.error("TrustLens could not inspect already-open tabs.", error);
  }
}

chrome.runtime.onInstalled.addListener(() => void inspectOpenTabs());
chrome.runtime.onStartup.addListener(() => void inspectOpenTabs());
