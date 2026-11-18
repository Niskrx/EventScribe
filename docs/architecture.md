# Architecture Notes

The planned architecture separates AI interpretation from deterministic document rendering:

```text
Next.js frontend
        |
        v
FastAPI backend
   |        |         |
   v        v         v
Supabase  Gemini   DOCX/PDF renderer
```

The AI layer produces validated JSON for format specifications and report content. Python code consumes that JSON and constructs the actual DOCX/PDF files. The frontend never receives or stores the Gemini API key.

The detailed architecture, schemas, API proposal, and rendering rules are maintained in `PRD.md`.
