# Architecture

TrustLens AI is a Manifest V3 Chrome extension with a Vite/React/TypeScript preview. Its toolbar popup is the primary compact surface, and the same UI can be opened as a browser side panel. Report, page inspection, trust-change, history, and settings views are navigation states within that panel.

## Extension layout

- `extension/manifest.json` defines the packaged extension and its user-initiated permissions.
- `extension/popup/` contains the popup HTML, React entry point, shared popup/preview styles, and browser-local persistence.
- `extension/scanner/scanningService.ts` is the typed `ScanningService` implementation. It injects a read-only metadata inspector into the active HTTP(S) tab after the user invokes a scan.
- `extension/shared/result-schema.ts` and `constants.ts` define shared contracts and score thresholds.
- `extension/shared/demoFixtures.ts` contains isolated, clearly labeled preview examples. Demo data is never returned as a real page scan.
- `extension/src/App.tsx` implements the popup views and their interactions.

The toolbar action opens the compact popup. A user-initiated header action can open the same UI in Chrome's side panel (Chrome 116+); the preview renders as a compact sidebar rather than an analytics dashboard.

The local score starts at 8. Signals add transparent contributions, capped at 100; 30 is the medium threshold and 65 is the high threshold. These are heuristic rules, not a trained model or site reputation lookup.

## Runtime boundaries

The FastAPI service in `backend/app` analyzes only client-submitted metadata and never fetches the target. The popup does not connect to it yet. The web preview cannot inspect a browser tab. It can validate an address, but an arbitrary entered URL returns an unavailable state rather than a fabricated result. Only the extension scans its active tab.

The standalone API has no user authentication or deployment hardening. Keep it bound to localhost or a trusted private network until authentication, transport security, rate limits, and a reviewed extension-origin policy are implemented.

No FastAPI backend is currently connected. `ScanningService` is the seam for a future API implementation; remote classification is explicitly marked unavailable in Settings. The page scanner does not fetch target websites or send browsing data to a remote service.

## Build output

`npm run build` produces a browser preview at `dist/index.html` and the unpacked extension under `dist/`, with its manifest at `dist/manifest.json`. In Chrome, load the `dist` folder as an unpacked extension.
