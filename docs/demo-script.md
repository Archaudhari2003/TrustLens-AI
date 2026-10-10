# Demo script

1. Open the web preview with `npm run dev`. It starts in the unscanned state because a web page cannot inspect the browser's active tab.
2. Use **Try a labeled demo** to load the low-risk case. Point out that “low” means no strong available signals, not a safety guarantee.
3. Load the review-recommended case and expand the numeric-host indicator.
4. Load the high-risk case. Highlight the cross-domain password destination and HTTP-sensitive-form evidence, then open **Full report** and **Page analysis**.
5. Open **Website Trust Changes**. Explain that the realistic baseline comparison is demo data and a changed behavior requires reassessment rather than proving compromise.
6. Open **Settings** to show local-only scanning, browser-local history, theme, and the clearly disconnected remote service.

For a live local scan, load the unpacked extension in Chrome and scan a regular HTTP(S) page. Browser-internal pages are deliberately not inspected.
