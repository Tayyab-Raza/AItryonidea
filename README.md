# Trendzila AI Try-On Handoff

Mobile-first prototype for a Trendzila product-page AI try-on flow.

This handoff uses **Google direct Gemini image API**:

- Model: `gemini-3.1-flash-image`
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/interactions`
- Preview size: `image_size: "512"`
- Output ratio: `3:4`

## Local Setup

```bash
npm install
cp .env.local.example .env.local
# add GEMINI_API_KEY to .env.local
npm run dev
```

Open the local URL printed by Next.js.

## Important Files

| File | Purpose |
|---|---|
| `app/page.js` | Mobile product page and try-on bottom-sheet flow |
| `app/api/tryon/route.js` | Server-side Gemini image-generation proxy |
| `app/styles.css` | Mobile UI styling |
| `public/assets/` | Product/demo assets used by the prototype |
| `docs/SHOPIFY_HANDOFF.md` | Implementation notes for the Shopify developer |
| `docs/API_CONTRACT.md` | Request/response contract for the try-on endpoint |

## Security

Do not expose `GEMINI_API_KEY` in browser JavaScript, theme Liquid, or public app config. Keep image generation behind a server-side endpoint.

## Current UX

- Static `AI Try On` CTA on the product page.
- Intro sheet explaining the feature.
- Photo upload or sample photo.
- Front image generated first.
- Right and back angles generated after the front image, in the background.
- Result view supports front/right/back tabs and arrows.

## Production Decision

Use Gemini direct `gemini-3.1-flash-image` with `image_size: "512"` for the first preview. Regenerate at `1K` only if the business wants higher quality for save/share/download flows.
