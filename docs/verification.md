# Verification — 2026-09-17

## Automated

`npm test`: 4 suites passed. HTTP/HTTPS, scheme-less hosts and ports, internationalized URLs, query/fragment round-trips; unsafe/invalid inputs; all 4 output sizes × 5 preset colors with a 20%-wide central occlusion; low contrast and unsupported sizes rejected.

`npm run build`: passed. `npm install` audit: 0 known vulnerabilities at installation.

## Browser

- 393px, 1024px, 1440px viewport checks: no document horizontal overflow.
- Generated a 512px QR, changed color/size, confirmed stale export was disabled.
- Loaded a PNG image, generated and decoded a 1024px orange QR including that image.
- Removed the image; an intentionally corrupted PNG showed an actionable Japanese error.
- PNG save initiated successfully; the embedded browser did not expose a download event, so OS file persistence was not independently verified there.
- Actual iPhone/iPad hardware and native iOS share destinations were not available for testing.

## Standards

Independent review identified untranslated image decode errors and a 24px mobile footer link. Both fixed: decode failures use Japanese recovery guidance and the link has a 44px target. No remaining reported findings.

## Spec

Independent review identified scheme-less host:port rejection and image decode error copy. Both fixed, with host:port regression coverage and browser validation of corrupted PNG handling. No remaining reported findings.
