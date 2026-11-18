# EventScribe demo runbook

Use fictional, non-sensitive data only. Prepare the demo before presenting it.

## Preparation

- Reference format: `Annual Academic Event Report`, supplied as a short fictional PDF or DOCX.
- Event: `Innovation Showcase 2026` at `Northstar University`.
- Date: `18 November 2026`.
- Organiser: `Department of Computer Applications`.
- Photographs: three fictional or openly licensed images, with captions and ordering.
- Incomplete event: omit one optional fact to show a warning without inventing a value.

## Demo sequence

1. Open the deployed frontend and sign in as the demo professor.
2. Upload or describe the reference format.
3. Show the detected sections and confirm the saved format profile.
4. Create the event and enter only verified facts.
5. Upload three photographs, reorder them, and add captions.
6. Generate the structured report.
7. Point out that uncertain or missing facts remain warnings instead of fabricated claims.
8. Edit one section and save the new version.
9. Render and download both DOCX and PDF.
10. Reopen the report from history and show its status and timestamps.
11. Show GitHub branches, pull requests, CI verification, PRD, and implementation plan.

## Recovery notes

- If AI is unavailable, demonstrate the format review and report editor with the local fallback, then state that provider setup is pending.
- If PDF conversion fails, show the DOCX output and stop; do not present an unverified PDF.
- If a request returns `401`, check the signed-in session and callback URL before changing code.
- If an upload is rejected, use a supported PDF, DOCX, or image and remain within documented size limits.
