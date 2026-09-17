# QR Studio specification

- Japanese URL-to-QR web app, no sign-in. URL submission explicitly generates the result.
- Optional user-selected central image (PNG/JPEG/WebP), removable. No URL or image is uploaded.
- Select QR foreground color with a white background; reject insufficient contrast.
- PNG export sizes: 256, 512 (default), 1024, 2048 square pixels.
- Black base with orange and white, usable on iPhone 16, iPad Pro and desktop.
- Native file sharing when supported; download fallback and explicit instructions otherwise.
- Decode the final composited QR before enabling export; never export a stale result after edits.
- Public GitHub repository japankazuki4242-code/qr-studio. Deployed web URL.
- User approved the recommended name and specification on 2026-09-17.

## Implementation standards

- Keep all processing on the device; never fetch the user-entered destination URL.
- No secrets, user data, temporary archives or dependencies in Git.
- Validate input and show actionable Japanese errors. Preserve accessibility labels, keyboard focus, live status and 44px touch controls.
- Use standards-based QR generation with error correction H and a quiet zone of at least 4 modules.
- Treat image decode and PNG encoding as asynchronous; prevent stale exports and out-of-order results.
