import type { PageDomMetadata } from "../shared/result-schema";

export function inspectPage(): PageDomMetadata {
  const forms = Array.from(document.forms).map((form) => {
    const fields = Array.from(form.querySelectorAll("input"));
    const hasPassword = fields.some((field) => field.type.toLowerCase() === "password");
    const paymentFieldCount = fields.filter((field) =>
      /^(cc-number|cc-exp|cc-csc|cc-name)$/.test(field.autocomplete.toLowerCase())
    ).length;
    let actionHost = location.hostname;
    if (hasPassword) {
      try {
        const action = new URL(form.getAttribute("action") || location.href, location.href);
        if (action.protocol === "http:" || action.protocol === "https:") actionHost = action.hostname;
      } catch {
        actionHost = "unparseable form destination";
      }
    }
    return { hasPassword, paymentFieldCount, actionHost };
  });

  let externalLinkCount = 0;
  for (const link of Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
    try {
      const target = new URL(link.href, location.href);
      if ((target.protocol === "http:" || target.protocol === "https:") && target.hostname !== location.hostname) {
        externalLinkCount += 1;
      }
    } catch {
      continue;
    }
  }

  const externalResourceHosts = new Set<string>();
  for (const resource of Array.from(document.querySelectorAll<HTMLImageElement | HTMLScriptElement | HTMLLinkElement>("img[src],script[src],link[href]"))) {
    const address = resource instanceof HTMLLinkElement ? resource.href : resource.src;
    try {
      const target = new URL(address, location.href);
      if ((target.protocol === "http:" || target.protocol === "https:") && target.hostname !== location.hostname) {
        externalResourceHosts.add(target.hostname);
      }
    } catch {
      continue;
    }
  }

  const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return {
    forms,
    externalLinkCount,
    externalResourceHosts: Array.from(externalResourceHosts),
    redirectCount: navigationEntry ? navigationEntry.redirectCount : null
  };
}
