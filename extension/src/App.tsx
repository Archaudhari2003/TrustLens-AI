import { useEffect, useMemo, useState } from "react";
import trustlensLogo from "../icons/trustlens.svg";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Clock3,
  FileDown,
  FileText,
  Fingerprint,
  Globe2,
  History,
  Info,
  LockKeyhole,
  Menu,
  PanelRight,
  RefreshCw,
  ScanLine,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  SlidersHorizontal,
  X
} from "lucide-react";
import { demoFixtures, trustChangeDemo } from "../shared/demoFixtures";
import {
  defaultSettings,
  loadHistory,
  loadSettings,
  saveHistory,
  saveSettings
} from "../popup/persistence";
import { LocalScanningService, ScanUnavailableError } from "../scanner/scanningService";
import type { PageObservation, RiskIndicator, RiskLevel, ScanHistoryEntry, ScanResult, Screen, UserSettings } from "../shared/result-schema";

const scanner = new LocalScanningService();
const previewMode = !globalThis.chrome?.scripting;

const riskText: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Review recommended",
  high: "High risk"
};

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function RiskIcon({ level, size = 18 }: { level: RiskLevel; size?: number }) {
  if (level === "high") return <ShieldAlert size={size} aria-hidden="true" />;
  if (level === "medium") return <ShieldQuestion size={size} aria-hidden="true" />;
  return <ShieldCheck size={size} aria-hidden="true" />;
}

function App() {
  const [screen, setScreen] = useState<Screen>("popup");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanState, setScanState] = useState<"unscanned" | "scanning" | "ready" | "unavailable">("unscanned");
  const [activeHost, setActiveHost] = useState("");
  const [activeWindowId, setActiveWindowId] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [demoId, setDemoId] = useState("low");
  const [expandedEvidence, setExpandedEvidence] = useState<string[]>([]);
  const [expandedObservations, setExpandedObservations] = useState<string[]>([]);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy report");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadSettings(), loadHistory()]).then(([savedSettings, savedHistory]) => {
      if (!mounted) return;
      setSettings(savedSettings);
      setHistory(savedHistory);
      setSettingsLoaded(true);
    }).catch((loadError: unknown) => {
      if (!mounted) return;
      setError(loadError instanceof Error ? loadError.message : "Saved preferences could not be loaded.");
      setSettingsLoaded(true);
    });

    if (globalThis.chrome?.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (!mounted) return;
        if (typeof tab?.windowId === "number") setActiveWindowId(tab.windowId);
        if (!tab?.url) return;
        try {
          const parsed = new URL(tab.url);
          if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            setActiveHost(parsed.hostname);
            setUrlInput(parsed.origin);
          }
        } catch {
          setActiveHost("");
        }
      }).catch(() => {
        if (mounted) setError("The active website address is unavailable.");
      });
    }
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = settings.theme === "system"
      ? (prefersDark ? "dark" : "light")
      : settings.theme;
  }, [settings.theme]);

  const currentHost = result?.host ?? activeHost;
  const topEvidence = useMemo(
    () => result?.evidence.slice().sort((a, b) => b.contribution - a.contribution).slice(0, 3) ?? [],
    [result]
  );

  async function runScan(fixtureId?: string) {
    setError("");
    setMessage("");
    setUrlError("");
    setScanState("scanning");
    try {
      const url = fixtureId ? `https://${demoFixtures[fixtureId].host}` : urlInput;
      const scanned = await scanner.scan({ url, demoFixtureId: fixtureId });
      setResult(scanned);
      setActiveHost(scanned.host);
      setScanState("ready");
      setExpandedEvidence([]);
      if (settings.saveScanHistory) {
        try {
          await saveHistory(scanned);
          setHistory(await loadHistory());
        } catch (historyError) {
          setError(historyError instanceof Error ? historyError.message : "The scan completed, but its history could not be saved.");
        }
      }
      if (settings.scanAlerts) setMessage(`Scan complete · ${riskText[scanned.classification]}`);
    } catch (scanError) {
      setScanState("unavailable");
      setError(scanError instanceof ScanUnavailableError || scanError instanceof Error
        ? scanError.message
        : "The page could not be inspected. Try again.");
    }
  }

  function validateAndRunAddress() {
    setUrlError("");
    let parsed: URL;
    try {
      parsed = new URL(urlInput);
    } catch {
      setUrlError("Enter a complete website address, such as https://example.com.");
      return;
    }
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
      setUrlError("Only complete HTTP or HTTPS website addresses can be inspected.");
      return;
    }
    setActiveHost(parsed.hostname);
    void runScan();
  }

  async function updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    setError("");
    try {
      await saveSettings(next);
    } catch (settingError) {
      setSettings(settings);
      setError(settingError instanceof Error ? settingError.message : "The preference could not be saved.");
    }
  }

  async function copyReport() {
    if (!result) return;
    const text = [
      `TrustLens AI ${result.source === "demo" ? "demo " : ""}assessment`,
      `Website: ${result.host}`,
      `Assessment: ${riskText[result.classification]} · ${result.score}/100`,
      `Scanned: ${formatTime(result.scannedAt)}`,
      `Summary: ${result.summary}`,
      `Recommended action: ${result.recommendation}`,
      "Evidence:",
      ...(result.evidence.length
        ? result.evidence.map((item) => `- ${item.title} (${item.severity}): ${item.summary}`)
        : ["- No strong risk indicators found in the checks available."]),
      "This assessment is not a guarantee of safety."
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel("Copied");
      window.setTimeout(() => setCopyLabel("Copy report"), 1800);
      setError("");
    } catch {
      setError("Clipboard access was unavailable. You can export the report as JSON instead.");
    }
  }

  function exportReport() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `trustlens-${result.host}-${result.scannedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(href);
  }

  async function exportPdfReport() {
    if (!result) return;
    try {
      const { downloadAssessmentPdf } = await import("../popup/report-export");
      downloadAssessmentPdf(result);
      setError("");
    } catch (exportError) {
      setError(exportError instanceof Error ? `PDF export failed: ${exportError.message}` : "PDF export failed. Try exporting the JSON report instead.");
    }
  }

  function toggleExpanded(id: string, kind: "evidence" | "observation") {
    const current = kind === "evidence" ? expandedEvidence : expandedObservations;
    const update = kind === "evidence" ? setExpandedEvidence : setExpandedObservations;
    update(current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function goTo(next: Screen) {
    setError("");
    setMessage("");
    setScreen(next);
  }

  function openSidePanel() {
    const sidePanel = globalThis.chrome?.sidePanel;
    if (!sidePanel?.open || activeWindowId === null) {
      setError("The browser side panel is not available in this window.");
      return;
    }
    void sidePanel.open({ windowId: activeWindowId }).catch(() => {
      setError("The browser could not open the TrustLens side panel. Try again from the extension popup.");
    });
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <button className="brand" type="button" onClick={() => goTo("popup")} aria-label="TrustLens AI home">
          <img className="brand-logo" src={trustlensLogo} alt="" />
          <span className="brand-copy">
            <span className="brand-name">TrustLens AI</span>
            <span className="brand-tagline">Smart Web Trust Engine</span>
          </span>
        </button>
        <div className="header-actions">
          {screen === "popup" && <span className="local-status"><span className="status-dot" />{previewMode ? "Popup preview" : "Local scan"}</span>}
          {!previewMode && Boolean(globalThis.chrome?.sidePanel?.open) && (
            <button className="icon-button" type="button" onClick={openSidePanel} aria-label="Open in browser side panel" title="Open in browser side panel">
              <PanelRight size={16} />
            </button>
          )}
          <button className="icon-button" type="button" onClick={() => goTo("settings")} aria-label="Open settings">
            <Settings2 size={17} />
          </button>
        </div>
      </header>

      {screen !== "popup" && (
        <div className="subnav">
          <button className="back-button" type="button" onClick={() => goTo("popup")}>
            <ArrowLeft size={15} /> Overview
          </button>
          <span className="subnav-title">{screenTitle(screen)}</span>
          <button className="icon-button small" type="button" onClick={() => goTo("settings")} aria-label="Open settings">
            <Settings2 size={16} />
          </button>
        </div>
      )}

      <div className="content">
        {error && (
          <div className="notice notice-error" role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
            {scanState === "unavailable" && (
              <button className="notice-action" type="button" onClick={() => runScan()}>Retry</button>
            )}
            <button className="notice-close" type="button" onClick={() => setError("")} aria-label="Dismiss error"><X size={14} /></button>
          </div>
        )}
        {message && <div className="notice notice-success" role="status"><Check size={15} />{message}<button className="notice-close" type="button" onClick={() => setMessage("")} aria-label="Dismiss message"><X size={14} /></button></div>}

        {screen === "popup" && (
          <PopupScreen
            currentHost={currentHost}
            activeHost={activeHost}
            result={result}
            scanState={scanState}
            previewMode={previewMode}
            urlInput={urlInput}
            setUrlInput={(value) => { setUrlInput(value); setUrlError(""); }}
            urlError={urlError}
            validateAndRunAddress={validateAndRunAddress}
            demoId={demoId}
            setDemoId={setDemoId}
            runScan={runScan}
            topEvidence={topEvidence}
            expandedEvidence={expandedEvidence}
            toggleExpanded={toggleExpanded}
            open={goTo}
            history={history}
            showWarnings={settings.showRiskWarnings}
          />
        )}
        {screen === "report" && (
          <ReportScreen result={result} scanState={scanState} runScan={runScan} copyReport={copyReport} copyLabel={copyLabel} exportReport={exportReport} exportPdfReport={exportPdfReport} open={goTo} />
        )}
        {screen === "analysis" && (
          <AnalysisScreen result={result} scanState={scanState} expanded={expandedObservations} toggle={(id) => toggleExpanded(id, "observation")} />
        )}
        {screen === "trust" && <TrustScreen />}
        {screen === "history" && <HistoryScreen history={history} open={(entry) => {
          const historicalResult = entry.source === "demo"
            ? Object.values(demoFixtures).find((item) => item.host === entry.host)
            : undefined;
          if (historicalResult) {
            setResult(historicalResult);
            setScanState("ready");
          } else {
            setResult(null);
            setActiveHost(entry.host);
            setScanState("unscanned");
          }
          goTo(historicalResult ? "report" : "popup");
        }} />}
        {screen === "settings" && (
          <SettingsScreen
            settings={settings}
            settingsLoaded={settingsLoaded}
            updateSetting={updateSetting}
            open={goTo}
          />
        )}
      </div>

      {screen === "popup" && (
        <footer className="app-footer">
          <span><LockKeyhole size={12} /> Scanned on this device</span>
          <button type="button" onClick={() => goTo("history")}><History size={13} /> History</button>
        </footer>
      )}
    </main>
  );
}

function screenTitle(screen: Screen): string {
  const titles: Record<Screen, string> = {
    popup: "Overview",
    report: "Assessment report",
    analysis: "Page analysis",
    trust: "Website trust changes",
    history: "Scan history",
    settings: "Settings"
  };
  return titles[screen];
}

interface PopupScreenProps {
  currentHost: string;
  activeHost: string;
  result: ScanResult | null;
  scanState: "unscanned" | "scanning" | "ready" | "unavailable";
  previewMode: boolean;
  urlInput: string;
  setUrlInput: (value: string) => void;
  urlError: string;
  validateAndRunAddress: () => void;
  demoId: string;
  setDemoId: (value: string) => void;
  runScan: (fixtureId?: string) => Promise<void>;
  topEvidence: RiskIndicator[];
  expandedEvidence: string[];
  toggleExpanded: (id: string, kind: "evidence" | "observation") => void;
  open: (screen: Screen) => void;
  history: ScanHistoryEntry[];
  showWarnings: boolean;
}

function PopupScreen(props: PopupScreenProps) {
  const {
    currentHost, activeHost, result, scanState, previewMode, urlInput, setUrlInput, urlError,
    validateAndRunAddress, demoId, setDemoId, runScan, topEvidence, expandedEvidence,
    toggleExpanded, open, history, showWarnings
  } = props;
  const classification = result?.classification;
  const transport = result?.observations.find((item) => item.id === "transport")?.value;
  return (
    <>
      <section className="website-card">
        <div className="section-label">Website</div>
        <div className="website-line">
          <div className="website-symbol"><Globe2 size={17} /></div>
          <div className="website-info">
            <strong title={currentHost || undefined}>{currentHost || "No website selected"}</strong>
            <span>{currentHost ? (result ? `Last checked ${formatTime(result.scannedAt)}` : "Ready to inspect") : "Open a website to get started"}</span>
          </div>
          {currentHost && <span className={`protocol-badge ${transport === "HTTPS" ? "" : "protocol-unverified"}`}>{transport === "HTTPS" ? <LockKeyhole size={11} /> : <Globe2 size={11} />}{transport ?? "UNSCANNED"}</span>}
        </div>
        <button
          className={`primary-button ${classification ? `button-${classification}` : ""}`}
          type="button"
          onClick={() => void runScan()}
          disabled={scanState === "scanning" || (!previewMode && !activeHost)}
        >
          {scanState === "scanning" ? "Scanning…" : <><ScanLine size={16} />{previewMode ? "Inspect active tab" : "Scan this page"}</>}
        </button>
        {previewMode && (
          <div className="preview-tools">
            <label htmlFor="address-input">Preview an address</label>
            <div className="address-row">
              <input id="address-input" type="url" autoComplete="url" placeholder="https://example.com" value={urlInput} onChange={(event) => setUrlInput(event.target.value)} aria-invalid={Boolean(urlError)} aria-describedby={urlError ? "url-error" : "preview-note"} />
              <button type="button" onClick={validateAndRunAddress}>Check</button>
            </div>
            {urlError ? <span id="url-error" className="field-error">{urlError}</span> : <span id="preview-note" className="field-note">Web preview only · address inspection requires the extension</span>}
            <div className="demo-row">
              <label htmlFor="demo-select">Try a labeled demo</label>
              <select id="demo-select" value={demoId} onChange={(event) => setDemoId(event.target.value)}>
                <option value="low">Low-risk example</option>
                <option value="medium">Review recommended</option>
                <option value="high">High-risk example</option>
              </select>
              <button type="button" className="demo-button" onClick={() => void runScan(demoId)} disabled={scanState === "scanning"}>Load demo</button>
            </div>
          </div>
        )}
      </section>

      {scanState === "unscanned" && (
        <section className="empty-state">
          <div className="empty-icon"><ScanLine size={19} /></div>
          <strong>Ready to check this page</strong>
          <p>Scan for suspicious website signals. Your data stays on this device.</p>
        </section>
      )}
      {scanState === "scanning" && (
        <div className="scan-progress" role="status" aria-live="polite">
          <span className="scan-spinner" aria-hidden="true" />
          <span>Checking this page…</span>
        </div>
      )}
      {scanState === "unavailable" && (
        <section className="empty-state unavailable-state">
          <div className="empty-icon"><ShieldQuestion size={19} /></div>
          <strong>Analysis unavailable</strong>
          <p>Use the installed extension on an HTTP or HTTPS page, or load a demo scenario in this preview.</p>
        </section>
      )}
      {scanState === "ready" && result && (
        <>
          {result.source === "demo" && <div className="demo-label"><Info size={13} /> DEMO DATA · Not a live website scan</div>}
          <RiskSummary result={result} />
          {classification === "high" && showWarnings && <RecommendedAction result={result} prominent />}
          <section className="evidence-section">
            <div className="section-heading">
              <div><h2>Key indicators</h2><span>{result.evidence.length ? `${result.evidence.length} signals` : "No strong signals"}</span></div>
              <button className="text-button" type="button" onClick={() => open("analysis")}>Details <ArrowRight size={13} /></button>
            </div>
            {topEvidence.length
              ? <div className="indicator-list">{topEvidence.map((item) => <EvidenceRow key={item.id} item={item} expanded={expandedEvidence.includes(item.id)} onToggle={() => toggleExpanded(item.id, "evidence")} />)}</div>
              : <div className="no-findings"><CheckCircle2 size={15} /><span>No strong indicators found in the available checks.</span></div>}
          </section>
          {classification !== "high" && result && <RecommendedAction result={result} />}
          <div className="action-grid report-export-actions">
            <button className="secondary-button" type="button" onClick={() => open("report")}><BookOpenCheck size={15} />Full report</button>
            <button className="secondary-button" type="button" onClick={() => open("analysis")}><SlidersHorizontal size={15} />Page analysis</button>
          </div>
          <button className="trust-change-link" type="button" onClick={() => open("trust")}>
            <Fingerprint size={15} /><span><strong>Website Trust Changes</strong><small>Compare against a demo baseline</small></span><ChevronRight size={15} />
          </button>
          {history.length === 0 && <p className="privacy-line"><LockKeyhole size={12} />History is empty until you save a scan.</p>}
        </>
      )}
      {scanState === "ready" && !result && <div className="empty-state"><strong>Result unavailable</strong><p>Retry the scan to generate a local assessment.</p></div>}
    </>
  );
}

function RiskSummary({ result }: { result: ScanResult }) {
  const [displayedScore, setDisplayedScore] = useState(0);
  useEffect(() => {
    const targetScore = result.score;
    const duration = 650;
    const startedAt = performance.now();
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplayedScore(targetScore);
      return;
    }

    let animationFrame = 0;
    const animateScore = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      setDisplayedScore(Math.round(targetScore * progress));
      if (progress < 1) animationFrame = window.requestAnimationFrame(animateScore);
    };
    animationFrame = window.requestAnimationFrame(animateScore);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [result.score, result.scannedAt]);

  const verdict = result.classification === "low"
    ? "Website looks safe"
    : result.classification === "medium"
      ? "Proceed with caution"
      : "High risk website";
  const riskLabel = result.classification === "low"
    ? "Low Risk"
    : result.classification === "medium"
      ? "Medium Risk"
      : "High Risk";
  return (
    <section className={`risk-summary risk-${result.classification}`} aria-label={`${riskText[result.classification]} score ${result.score} out of 100`}>
      <div className="risk-topline">
        <span className="risk-state"><RiskIcon level={result.classification} size={18} />{verdict}</span>
      </div>
      <div
        className="score-gauge"
        role="img"
        aria-label={`Risk score ${result.score} out of 100`}
        style={{ background: `conic-gradient(var(--risk-color) ${result.score * 3.6}deg, var(--risk-track) 0deg)` }}
      >
        <span className="score-gauge-value"><strong>{displayedScore}</strong><small>/100</small></span>
      </div>
      <span className="risk-pill">{riskLabel}</span>
      <p>{result.summary}</p>
      <span className="assessment-source">{result.source === "demo" ? "Example assessment" : result.source === "remote" ? "Backend rule-based assessment" : "Local heuristic assessment"} · not a safety guarantee</span>
    </section>
  );
}

function EvidenceRow({ item, expanded, onToggle, expandable = true }: {
  item: RiskIndicator;
  expanded: boolean;
  onToggle?: () => void;
  expandable?: boolean;
}) {
  const content = (
    <>
      <span className="evidence-icon">{item.severity === "high" ? <AlertTriangle size={15} /> : <Info size={15} />}</span>
      <span className="evidence-copy"><strong>{item.title}</strong><small>{item.summary}</small></span>
      <span className={`severity-label ${item.severity}`}>{item.severity}</span>
      {expandable && (expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />)}
    </>
  );
  return (
    <div className={`evidence-row severity-${item.severity}`}>
      {expandable
        ? <button type="button" className="evidence-trigger" onClick={onToggle} aria-expanded={expanded}>{content}</button>
        : <div className="evidence-trigger evidence-static">{content}</div>}
      {expanded && <div className="evidence-detail"><p>{item.technicalDetail}</p><span>Risk contribution <b>+{item.contribution}</b></span></div>}
    </div>
  );
}

function RecommendedAction({ result, prominent = false }: { result: ScanResult; prominent?: boolean }) {
  return (
    <section className={`recommendation ${prominent ? "recommendation-strong" : ""} ${result.classification}`}>
      <div className="recommendation-icon">{result.classification === "high" ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}</div>
      <div><strong>{result.classification === "high" ? "Recommended action" : "What to do next"}</strong><p>{result.recommendation}</p></div>
    </section>
  );
}

function ReportScreen({ result, scanState, runScan, copyReport, copyLabel, exportReport, exportPdfReport, open }: {
  result: ScanResult | null;
  scanState: string;
  runScan: (fixtureId?: string) => Promise<void>;
  copyReport: () => Promise<void>;
  copyLabel: string;
  exportReport: () => void;
  exportPdfReport: () => void;
  open: (screen: Screen) => void;
}) {
  if (!result) return <UnavailableContent title="No report to show" text="Scan a page or load a demo scenario to create an assessment report." scanning={scanState === "scanning"} onRetry={() => void runScan()} />;
  return (
    <>
      {result.source === "demo" && <div className="demo-label"><Info size={13} /> DEMO DATA · Not a live website scan</div>}
      <RiskSummary result={result} />
      <section className="report-section">
        <div className="section-label">ASSESSMENT</div>
        <h2>{result.host}</h2>
        <p className="report-summary">{result.summary}</p>
        <div className="report-meta"><span><Clock3 size={13} />{formatTime(result.scannedAt)}</span><span><Shield size={13} />{result.source === "demo" ? "Example record" : "Local-only scan"}</span></div>
      </section>
      <RecommendedAction result={result} prominent={result.classification === "high"} />
      <section className="report-section">
        <div className="section-heading"><div><h2>Security evidence</h2><span>Signals are not proof of compromise</span></div><button className="text-button" type="button" onClick={() => open("analysis")}>Technical details <ArrowRight size={13} /></button></div>
        {result.evidence.length
          ? <div className="indicator-list">{result.evidence.map((item) => <EvidenceRow key={item.id} item={item} expanded={true} expandable={false} />)}</div>
          : <div className="no-findings"><CheckCircle2 size={15} /><span>No strong risk indicators were found in the available checks.</span></div>}
      </section>
      <section className="report-section contribution-section">
        <div className="section-heading"><div><h2>Risk contribution</h2><span>Rule-based score · maximum 100</span></div></div>
        <div className="contribution-row"><span>Baseline</span><span>8</span></div>
        {result.evidence.map((item) => <div className="contribution-row" key={item.id}><span>{item.title}</span><span>+{item.contribution}</span></div>)}
        <div className="contribution-total"><span>Total score</span><b>{result.score}/100</b></div>
      </section>
      <section className="report-section low-confidence-note"><Info size={15} /><p>A low-risk result means only that this local scan found no strong indicators in the metadata it could inspect. It does not verify site ownership, reputation, or certificate-chain details.</p></section>
      <div className="action-grid">
        <button className="secondary-button" type="button" onClick={() => void copyReport()}><Clipboard size={14} />{copyLabel}</button>
        <button className="secondary-button" type="button" onClick={exportPdfReport}><FileText size={14} />Export PDF</button>
        <button className="secondary-button" type="button" onClick={exportReport}><FileDown size={14} />Export JSON</button>
      </div>
    </>
  );
}

function AnalysisScreen({ result, scanState, expanded, toggle }: {
  result: ScanResult | null;
  scanState: string;
  expanded: string[];
  toggle: (id: string) => void;
}) {
  if (!result) return <UnavailableContent title="Page analysis unavailable" text="Run a scan first. Only observable structure is inspected; private field values are never collected." />;
  return (
    <>
      {result.source === "demo" && <div className="demo-label"><Info size={13} /> DEMO DATA · Example observations</div>}
      <div className="analysis-intro"><span className="section-label">TECHNICAL INSPECTION</span><h1>{result.host}</h1><p>Structured page observations collected {result.source === "local" ? "locally" : "from a demo fixture"}.</p></div>
      <div className="observation-list">
        {result.observations.map((item) => <ObservationRow key={item.id} observation={item} expanded={expanded.includes(item.id)} onToggle={() => toggle(item.id)} />)}
      </div>
      <div className="privacy-card"><LockKeyhole size={16} /><div><strong>Private contents stay private</strong><p>TrustLens counts sensitive field types but never reads passwords, payment values, cookies, tokens, or form contents.</p></div></div>
      {scanState === "ready" && <div className="analysis-footer"><span>Hostname</span><b>{result.host}</b></div>}
    </>
  );
}

function ObservationRow({ observation, expanded, onToggle }: { observation: PageObservation; expanded: boolean; onToggle: () => void }) {
  const icon = observation.state === "observed" ? <CheckCircle2 size={15} /> : observation.state === "not-observed" ? <Info size={15} /> : <CircleHelp size={15} />;
  return (
    <section className={`observation-row state-${observation.state}`}>
      <button type="button" className="observation-trigger" onClick={onToggle} aria-expanded={expanded}>
        <span className="observation-icon">{icon}</span>
        <span className="observation-copy"><strong>{observation.label}</strong><small>{observation.value}</small></span>
        {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>
      {expanded && <p className="observation-detail">{observation.detail}</p>}
    </section>
  );
}

function TrustScreen() {
  const change = trustChangeDemo;
  return (
    <>
      <div className="demo-label"><Info size={13} /> DEMO DATA · Baseline storage is not connected</div>
      <section className="trust-intro">
        <span className="section-label">ADAPTIVE TRUST</span>
        <h1>Website Trust Changes</h1>
        <p>Observable behaviour can change. A change warrants reassessment; it is not automatic proof of compromise.</p>
      </section>
      <section className="trust-domain"><Globe2 size={17} /><div><strong>{change.domain}</strong><span>Last observed {formatTime(change.lastObserved)}</span></div></section>
      <div className="comparison">
        <AssessmentChip label="Previous assessment" level={change.previousAssessment} score={change.previousScore} />
        <ArrowRight size={16} className="comparison-arrow" />
        <AssessmentChip label="Current assessment" level={change.currentAssessment} score={change.currentScore} />
      </div>
      <section className="trust-changes">
        <h2>Changed indicators</h2>
        {change.changedIndicators.map((item) => <div className="changed-indicator" key={item}><AlertTriangle size={15} /><span>{item}</span></div>)}
      </section>
      <section className="trust-timeline">
        <h2>Change timeline</h2>
        {change.timeline.map((entry, index) => (
          <div className="timeline-entry" key={entry.title}>
            <div className={`timeline-marker ${index === 0 ? "active" : ""}`}><span /></div>
            <div><time>{entry.date}</time><strong>{entry.title}</strong><p>{entry.detail}</p></div>
          </div>
        ))}
      </section>
      <RecommendedAction result={{ ...demoFixtures.high, recommendation: "Reassess this domain through a trusted channel before entering credentials." }} />
    </>
  );
}

function AssessmentChip({ label, level, score }: { label: string; level: RiskLevel; score: number }) {
  return <div className={`assessment-chip risk-${level}`}><span>{label}</span><b><RiskIcon level={level} size={14} />{riskText[level]}</b><small>{score}/100</small></div>;
}

function HistoryScreen({ history, open }: { history: ScanHistoryEntry[]; open: (entry: ScanHistoryEntry) => void }) {
  return (
    <>
      <section className="page-intro"><span className="section-label">ON THIS DEVICE</span><h1>Scan history</h1><p>Only hostnames and summary scores are saved. Query strings and page contents are not stored.</p></section>
      {history.length === 0
        ? <div className="empty-state history-empty"><div className="empty-icon"><History size={18} /></div><strong>No saved scans</strong><p>Completed scans appear here when scan history is enabled in settings.</p></div>
        : <div className="history-list">{history.map((entry) => <button type="button" className="history-entry" key={`${entry.host}-${entry.scannedAt}`} onClick={() => open(entry)}>
          <span className={`history-icon ${entry.classification}`}><RiskIcon level={entry.classification} size={16} /></span>
          <span className="history-copy"><strong>{entry.host}</strong><small>{formatTime(entry.scannedAt)}{entry.source === "demo" ? " · demo" : ""}</small></span>
          <span className={`history-score ${entry.classification}`}>{entry.score}<small>/100</small></span>
        </button>)}</div>}
    </>
  );
}

function SettingsScreen({ settings, settingsLoaded, updateSetting, open }: {
  settings: UserSettings;
  settingsLoaded: boolean;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => Promise<void>;
  open: (screen: Screen) => void;
}) {
  return (
    <>
      <section className="page-intro"><span className="section-label">PREFERENCES</span><h1>Settings</h1><p>Choose what TrustLens saves and how it presents local results.</p></section>
      {!settingsLoaded && <div className="loading-note">Loading saved preferences…</div>}
      <div className="settings-group">
        <div className="settings-group-title">SCANNING & PRIVACY</div>
        <SettingRow icon={<Fingerprint size={16} />} title="Local-first scanning" description="Page metadata is inspected on this device. Sensitive values are never collected." trailing={<span className="always-on">Always on</span>} />
        <SettingRow icon={<Globe2 size={16} />} title="Remote classification" description="Not connected. No browsing data is sent to a remote service." trailing={<span className="api-status"><span />Not connected</span>} />
        <SettingRow icon={<AlertTriangle size={16} />} title="Risk warnings" description="Show clear recommendations when a scan finds concerning signals." trailing={<Switch checked={settings.showRiskWarnings} label="Risk warnings" onChange={(checked) => void updateSetting("showRiskWarnings", checked)} />} />
        <SettingRow icon={<History size={16} />} title="Scan history" description="Save hostnames, scan times, and summary scores on this device." trailing={<Switch checked={settings.saveScanHistory} label="Scan history" onChange={(checked) => void updateSetting("saveScanHistory", checked)} />} />
        <SettingRow icon={<Info size={16} />} title="Scan completion alert" description="Show a brief in-popup status after each scan." trailing={<Switch checked={settings.scanAlerts} label="Scan completion alert" onChange={(checked) => void updateSetting("scanAlerts", checked)} />} />
        <SettingRow icon={<ShieldAlert size={16} />} title="Automatic bad-site detection" description="Inspect HTTP/HTTPS pages locally as they load; medium- and high-risk findings trigger alerts." trailing={<Switch checked={settings.autoDetectBadSites} label="Automatic bad-site detection" onChange={(checked) => void updateSetting("autoDetectBadSites", checked)} />} />
        <SettingRow icon={<Info size={16} />} title="Beep alert" description="Beep only when automatic detection finds a strong high-risk signal." trailing={<Switch checked={settings.beepAlerts} label="Beep alert" onChange={(checked) => void updateSetting("beepAlerts", checked)} />} />
      </div>
      <div className="settings-group">
        <div className="settings-group-title">APPEARANCE</div>
        <div className="theme-setting"><div className="setting-icon"><Menu size={16} /></div><div className="setting-copy"><strong>Theme</strong><span>Match your preference or device setting.</span></div><select aria-label="Theme" value={settings.theme} onChange={(event) => void updateSetting("theme", event.target.value as UserSettings["theme"])}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
      </div>
      <section className="privacy-card settings-privacy"><LockKeyhole size={16} /><div><strong>Privacy, by design</strong><p>TrustLens does not transmit browsing history or sensitive form values. The remote analyzer is currently unavailable.</p><button type="button" className="text-button" onClick={() => open("analysis")}>What the scanner checks <ArrowRight size={13} /></button></div></section>
      <div className="settings-version">TrustLens AI · Local preview build</div>
    </>
  );
}

function SettingRow({ icon, title, description, trailing }: { icon: React.ReactNode; title: string; description: string; trailing: React.ReactNode }) {
  return <div className="setting-row"><div className="setting-icon">{icon}</div><div className="setting-copy"><strong>{title}</strong><span>{description}</span></div><div className="setting-control">{trailing}</div></div>;
}

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <button type="button" className={`switch ${checked ? "checked" : ""}`} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}><span /></button>;
}

function UnavailableContent({ title, text, scanning, onRetry }: { title: string; text: string; scanning?: boolean; onRetry?: () => void }) {
  return <section className="empty-state unavailable-state"><div className="empty-icon"><ShieldQuestion size={19} /></div><strong>{title}</strong><p>{text}</p>{onRetry && <button type="button" className="secondary-button retry-button" onClick={onRetry} disabled={scanning}>{scanning ? "Inspecting…" : <><RefreshCw size={14} />Try again</>}</button>}</section>;
}

export default App;
