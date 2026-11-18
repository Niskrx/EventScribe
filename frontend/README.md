# EventScribe Frontend

The frontend is a Next.js application with TypeScript and Tailwind CSS. It contains the professor-facing shell that will grow into authentication, event and format forms, uploads, report editing, preview, downloads, and report history.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run typecheck
npm run build
npm run verify
```

The frontend calls the FastAPI backend through `NEXT_PUBLIC_API_BASE_URL`. It must never call Gemini directly or contain secret credentials.
