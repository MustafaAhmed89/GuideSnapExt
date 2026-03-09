# Privacy Policy — GuideSnap

**Effective date:** March 9, 2026

## Overview

GuideSnap is a Chrome extension that helps you record browser interactions and export them as step-by-step guides. We take your privacy seriously: **GuideSnap collects no personal data and transmits nothing off your device.**

## Data Storage

All data created by GuideSnap — including screenshots, step descriptions, guide titles, and recording state — is stored **locally in your browser only**, using:

- `chrome.storage.local` — guide metadata and recording state
- `IndexedDB` — step records and screenshots

This data never leaves your device. It is not sent to any server, third party, or external service.

## Data Collection

GuideSnap does **not** collect, transmit, or share:

- Personal information of any kind
- Browsing history
- Passwords or form data (password fields are explicitly skipped)
- Analytics or usage telemetry
- Crash reports

## Permissions

The permissions GuideSnap requests are used solely to enable its core functionality:

| Permission | Purpose |
|---|---|
| `tabs` / `activeTab` | Capture screenshots and inject the recording overlay on the active tab |
| `storage` | Save guide data locally in your browser |
| `offscreen` | Annotate screenshots using the Canvas API |
| `alarms` | Keep the background service worker alive during long recordings |
| `<all_urls>` | Allow recording on any page you choose to document |

No permission is used to collect or transmit user data.

## Data Deletion

All guide data is stored in your browser's local storage. You can delete it at any time by:

- Removing individual guides within the GuideSnap popup, or
- Uninstalling the extension, which clears all associated storage

## Changes to This Policy

If this policy changes in a future release, the updated version will be committed to this repository with a revised effective date.

## Contact

For questions or concerns, open an issue at [github.com/MustafaAhmed89/GuideSnapExt/issues](https://github.com/MustafaAhmed89/GuideSnapExt/issues).
