import type { PageDomMetadata, PageSignals, ScanRequest, ScanResult } from "../shared/result-schema";
import { demoFixtures } from "../shared/demoFixtures";
import { analyzeForms } from "./form-analyzer";
import { inspectPage } from "./dom-analyzer";
import { buildLocalResult } from "./risk-engine";
import { analyzeUrl } from "./url-analyzer";

export interface ScanningService {
  scan(request: ScanRequest): Promise<ScanResult>;
}

export class ScanUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScanUnavailableError";
  }
}

export class LocalScanningService implements ScanningService {
  async scan(request: ScanRequest): Promise<ScanResult> {
    if (request.demoFixtureId) {
      const fixture = demoFixtures[request.demoFixtureId];
      if (!fixture) throw new ScanUnavailableError("That demo scenario is not available.");
      return { ...fixture, scannedAt: new Date().toISOString() };
    }

    if (!globalThis.chrome?.tabs || !globalThis.chrome?.scripting) {
      throw new ScanUnavailableError("Browser tab inspection is available in the installed extension. In this preview, use a labeled demo scenario instead.");
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) {
      throw new ScanUnavailableError("The active tab could not be inspected. Open a regular website and try again.");
    }

    let pageUrl: URL;
    try {
      pageUrl = new URL(tab.url);
    } catch {
      throw new ScanUnavailableError("This browser page does not have an inspectable website address.");
    }
    if (pageUrl.protocol !== "http:" && pageUrl.protocol !== "https:") {
      throw new ScanUnavailableError("For your privacy, only regular HTTP and HTTPS pages can be inspected.");
    }
    const [execution] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: inspectPage
    });
    if (!execution?.result) {
      throw new ScanUnavailableError("The page did not return inspection metadata. Try reloading the page and scanning again.");
    }

    return buildPageResult(tab.url, execution.result);
  }
}

export function buildPageResult(address: string, page: PageDomMetadata, scannedAt = new Date().toISOString()): ScanResult {
  const url = analyzeUrl(address);
  return buildLocalResult(combineSignals(url, page), scannedAt);
}

function combineSignals(url: ReturnType<typeof analyzeUrl>, page: PageDomMetadata): PageSignals {
  return {
    ...url,
    ...analyzeForms(page.forms, url.host),
    externalLinkCount: page.externalLinkCount,
    externalResourceHosts: page.externalResourceHosts,
    redirectCount: page.redirectCount
  };
}
