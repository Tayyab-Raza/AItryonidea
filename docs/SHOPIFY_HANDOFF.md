# Shopify Developer Handoff: Trendzila AI Try-On

## Objective

Add an AI try-on feature to eligible Trendzila product pages. The customer uploads a clear half-length or full-length photo, the system generates a realistic try-on preview using the product image and customer image, and the UI shows front first while other angles generate in the background.

## Final Model Decision

| Item | Decision |
|---|---|
| Provider | Google direct Gemini API |
| Model | `gemini-3.1-flash-image` |
| Endpoint | `https://generativelanguage.googleapis.com/v1beta/interactions` |
| Initial preview size | `image_size: "512"` |
| Output aspect ratio | `3:4` |
| Output format | JPEG |
| Server env var | `GEMINI_API_KEY` |

Important: use `"512"`, not `"512px"`. The API rejected `"512px"` in testing.

## Product Eligibility

| Product Type | Try-On Availability | Notes |
|---|---|---|
| Shirts | Enabled | Best current fit for this flow |
| T-shirts | Enabled | Use same upper-body prompt pattern |
| Overshirts / jackets | Enabled after testing | May need garment-specific prompt changes |
| Pants / bottoms | Disabled for current MVP | Current prompt and UI are upper-body focused |
| Accessories | Disabled for current MVP | Not part of the tested use case |
| Products without clean front product image | Disabled | The model needs a clear garment/product reference |

Shopify developer can decide the eligibility mechanism. Practical options are product type, tag, collection, or a lightweight product metafield if the merchant agrees.

## Frontend Flow Notes

| Step | UI Behavior | Technical Behavior |
|---|---|---|
| Product page | Show floating `AI Try On` CTA near lower-left area | Only show for eligible products |
| Intro sheet | Explain in 2 steps: upload photo, see shirt on you | Keep copy short on mobile |
| Upload | Accept JPG, PNG, WEBP; max 10 MB in prototype | Compress before sending if implementing in theme/app |
| Generate front | Start with `angle: "front"` | Show waiting state while request is active |
| Show result | Display front result immediately | Do not wait for all angles |
| Generate right/back | Trigger in background after front succeeds | Consider lazy generation only when user taps arrows to reduce cost |
| Result controls | Front/right/back tabs plus arrows | If an angle is not ready, show loading state in that angle slot |
| Add to cart | Close sheet and continue normal PDP cart flow | Use selected variant/size from product page |

## Waiting State

Use the waiting state to reduce perceived latency. The prototype includes fashion-tip style cards and staged progress copy.

| Waiting Element | Purpose |
|---|---|
| Progress stages | Makes the system feel active |
| Fashion tips/slideshow | Gives the user something to read during generation |
| Spinner | Basic processing feedback |
| Front-first result | Reduces total perceived wait |

## Recommended Generation Policy

| Action | Generation Strategy | Reason |
|---|---|---|
| Initial click | Generate front only at `512` | Lowest cost and fastest useful result |
| User views result | Start right in background or wait for arrow tap | Avoid wasted cost from bounced users |
| User taps next angle | Generate requested angle if not already ready | Cost follows engagement |
| User saves/shares | Optional regenerate active angle at `1K` | Higher quality only for high-intent actions |

## Prompt Guidance

Do not send the Shopify product title directly if it contains wording like `crop shirt`. During testing, "crop" caused Nano/Gemini outputs to make the shirt too short.

Use a cleaned garment description:

```text
white short-sleeve button shirt with black Roman-style illustrated print
```

Critical prompt clause:

```text
The shirt must not be cropped or short. The hem should fall below the waistline and cover the waistband or belt area, ending around the upper hip or top of the pockets, matching the garment length in the product reference. Do not expose the stomach, waistband, belt, or midriff. Do not make the shirt look one or two sizes too small in length.
```

## Backend Responsibilities

| Responsibility | Detail |
|---|---|
| Keep API key private | `GEMINI_API_KEY` must stay server-side |
| Validate input | Require one uploaded image or remote image URL |
| Fetch product reference | Use current product image URL or angle-specific reference |
| Send model request | Call Google `/v1beta/interactions` |
| Normalize output | Return one usable image URL/data URL to frontend |
| Handle failures | Return stable error codes and user-safe messages |
| Log diagnostics | Log provider status, timing, angle, model, and image size, not raw image data |

## Cost Notes

| Route | Approx Cost |
|---|---:|
| Google direct `512` preview | About `$0.045` per output image |
| Google direct `1K` | About `$0.067` per output image |
| fal Nano Banana 2 `512` | About `$0.06` per output image |
| fal Nano Banana 2 `1K` | About `$0.08` per output image |
| fal Nano Banana Pro `1K` | About `$0.15` per output image |

Use direct Google `512` as the default preview path.

## Benchmark Assets

The prototype was tested against two sample user photos and the Trendzila Roman Empire product image. Contact sheets are included in `docs/benchmark-assets/` for quick quality comparison.

## Production Checklist

| Area | Requirement |
|---|---|
| Secret handling | API key only in backend/app proxy |
| Rate limiting | Add per-IP/session rate limit before public launch |
| Abuse control | Block unsupported file types and very large images |
| Privacy | Decide whether uploaded photos are stored, cached, or discarded |
| Caching | Cache generated result per product/customer-photo hash where legally acceptable |
| Variant handling | Use current selected size/variant in UI; image generation can use product-level image for MVP |
| Failure UX | Let user retry or upload another photo |
| Analytics | Track CTA click, upload, generation start/success/failure, add-to-cart after try-on |
