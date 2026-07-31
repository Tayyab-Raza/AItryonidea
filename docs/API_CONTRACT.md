# Try-On API Contract

Prototype endpoint:

```http
POST /api/tryon
Content-Type: application/json
```

## Request

| Field | Type | Required | Notes |
|---|---|---:|---|
| `imageDataUrl` | string | Conditional | Base64 data URL from uploaded customer photo |
| `imageUrl` | string | Conditional | Remote customer image URL, useful for demo/sample photo |
| `angle` | string | No | `front`, `right`, or `back`; defaults to `front` |

Either `imageDataUrl` or `imageUrl` is required.

Example:

```json
{
  "imageDataUrl": "data:image/jpeg;base64,...",
  "angle": "front"
}
```

Sample/demo request:

```json
{
  "imageUrl": "https://example.com/customer-photo.jpg",
  "angle": "front"
}
```

## Success Response

```json
{
  "angle": "front",
  "imageUrl": "data:image/jpeg;base64,...",
  "model": "gemini-3.1-flash-image",
  "imageSize": "512"
}
```

| Field | Type | Notes |
|---|---|---|
| `angle` | string | Normalized requested angle |
| `imageUrl` | string | Data URL in this prototype; production can return CDN URL |
| `model` | string | Current Gemini model |
| `imageSize` | string | Current preview size |

## Error Responses

Missing image:

```json
{
  "error": "MISSING_IMAGE",
  "message": "Upload a clear half-length photo."
}
```

Missing API key:

```json
{
  "error": "MISSING_GEMINI_API_KEY",
  "message": "GEMINI_API_KEY is not configured on the server."
}
```

Provider request failure:

```json
{
  "error": "GEMINI_REQUEST_FAILED",
  "message": "Provider error message"
}
```

No image returned:

```json
{
  "error": "NO_IMAGE_RETURNED",
  "message": "Gemini did not return an image."
}
```

General failure:

```json
{
  "error": "GENERATION_FAILED",
  "message": "We could not generate this try-on. Please try another photo."
}
```

## Google Request Shape

The backend calls:

```http
POST https://generativelanguage.googleapis.com/v1beta/interactions
x-goog-api-key: <server-side key>
```

Body shape:

```json
{
  "model": "gemini-3.1-flash-image",
  "input": [
    { "type": "text", "text": "Prompt..." },
    { "type": "image", "mime_type": "image/jpeg", "data": "customer_base64" },
    { "type": "image", "mime_type": "image/jpeg", "data": "product_base64" }
  ],
  "response_format": {
    "type": "image",
    "mime_type": "image/jpeg",
    "aspect_ratio": "3:4",
    "image_size": "512"
  }
}
```

Important: `image_size` must be `"512"`. Testing showed `"512px"` fails with `invalid_request`.

## Production Notes

| Topic | Recommendation |
|---|---|
| Data URL response | Fine for prototype; production should upload output to app storage/CDN |
| Upload image size | Compress client-side before sending |
| Product image source | Use selected product/variant image or an approved try-on reference |
| Rate limits | Add before public launch |
| Logging | Log model, image size, angle, latency, provider error code; do not log customer image base64 |
