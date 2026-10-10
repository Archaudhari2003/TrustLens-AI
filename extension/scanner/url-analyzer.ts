import type { UrlSignals } from "../shared/result-schema";

export function analyzeUrl(address: string): UrlSignals {
  const parsed = new URL(address);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError("Only HTTP and HTTPS page addresses are supported.");
  }
  const hostname = parsed.hostname;
  const ipv4Parts = hostname.split(".");
  const isIpv4 = ipv4Parts.length === 4
    && ipv4Parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
  const isIpv6 = hostname.startsWith("[") && hostname.endsWith("]");
  return {
    protocol: parsed.protocol,
    host: hostname,
    hasUrlCredentials: Boolean(parsed.username || parsed.password),
    isIpAddress: isIpv4 || isIpv6,
    isPunycode: hostname.split(".").some((part) => part.startsWith("xn--"))
  };
}
