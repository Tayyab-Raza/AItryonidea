export const runtime = "nodejs";
export const maxDuration = 90;

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const GEMINI_MODEL = "gemini-3.1-flash-image";
const IMAGE_SIZE = "512";

const PRODUCT_IMAGE_URL =
  process.env.PRODUCT_IMAGE_URL ||
  "https://trendzila.in/cdn/shop/files/1F2A4807.jpg?v=1764150077&width=1445";

const productImageByAngle = {
  front: PRODUCT_IMAGE_URL,
  right: "https://trendzila.in/cdn/shop/files/1F2A4806.jpg?v=1764150076&width=1445",
  back: "https://trendzila.in/cdn/shop/files/1F2A4809.jpg?v=1764150077&width=1445"
};

const angleInstruction = {
  front:
    "Generate a front-facing try-on result. The person should face the camera or stand in a natural front-facing pose.",
  right:
    "Generate a right-side or three-quarter side try-on result. Keep the person turned to the right so the shirt side profile, sleeve volume, and side print placement are visible.",
  back:
    "Generate a back-facing try-on result. Show the back of the person wearing the same shirt, with the back print placement and collar visible."
};

function buildPrompt(angle) {
  return `Create a realistic fashion try-on image for a mobile fashion ecommerce product page.

Use image 1 as the customer/person reference.
Use image 2 as the garment/product reference.

Dress the person in the exact white short-sleeve button shirt from image 2. The garment has a black Roman-style illustrated print, a collar, short sleeves, a button placket, white fabric, and a relaxed oversized streetwear fit.

Critical fit requirement:
The shirt must not be cropped or short. The hem should fall below the waistline and cover the waistband or belt area, ending around the upper hip or top of the pockets, matching the garment length in the product reference. Do not expose the stomach, waistband, belt, or midriff. Do not make the shirt look one or two sizes too small in length.

Preserve the person's face, skin tone, body shape, hair, pose direction, and identity.
Preserve the garment's black illustrated artwork, collar shape, sleeve width, loose boxy drape, button placket, and white fabric tone.
Replace only the upper-body garment. Preserve the original background and natural lighting where possible.
${angleInstruction[angle]}
Do not add unrelated text or logos. Do not change the garment into plaid or a plain white shirt.
Do not make the person nude or sexualized.
Return one vertical try-on image.`;
}

function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data URL.");
  }
  return {
    mimeType: match[1],
    base64: match[2]
  };
}

async function remoteImageToInlinePart(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Could not fetch image: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    mimeType: contentType.split(";")[0],
    base64: buffer.toString("base64")
  };
}

async function personImageToInlinePart({ imageDataUrl, imageUrl }) {
  if (imageDataUrl) {
    return parseDataUrl(imageDataUrl);
  }
  return remoteImageToInlinePart(imageUrl);
}

function findOutputImage(json) {
  if (json?.output_image?.data) return json.output_image.data;

  const stack = [json];
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    if (
      current.type === "image" &&
      typeof current.data === "string" &&
      current.data.length > 100
    ) {
      return current.data;
    }
    for (const value of Object.values(current)) {
      if (value && typeof value === "object") stack.push(value);
    }
  }

  return "";
}

export async function POST(request) {
  try {
    const { imageDataUrl, imageUrl: personImageUrl, angle = "front" } = await request.json();
    const normalizedAngle = ["front", "right", "back"].includes(angle) ? angle : "front";

    if (
      (!imageDataUrl || typeof imageDataUrl !== "string") &&
      (!personImageUrl || typeof personImageUrl !== "string")
    ) {
      return Response.json(
        { error: "MISSING_IMAGE", message: "Upload a clear half-length photo." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        {
          error: "MISSING_GEMINI_API_KEY",
          message: "GEMINI_API_KEY is not configured on the server."
        },
        { status: 500 }
      );
    }

    const [personImage, productImage] = await Promise.all([
      personImageToInlinePart({ imageDataUrl, imageUrl: personImageUrl }),
      remoteImageToInlinePart(productImageByAngle[normalizedAngle])
    ]);

    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        input: [
          { type: "text", text: buildPrompt(normalizedAngle) },
          { type: "image", mime_type: personImage.mimeType, data: personImage.base64 },
          { type: "image", mime_type: productImage.mimeType, data: productImage.base64 }
        ],
        response_format: {
          type: "image",
          mime_type: "image/jpeg",
          aspect_ratio: "3:4",
          image_size: IMAGE_SIZE
        }
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          error: "GEMINI_REQUEST_FAILED",
          message: payload?.error?.message || "Gemini image generation failed."
        },
        { status: response.status }
      );
    }

    const imageBase64 = findOutputImage(payload);

    if (!imageBase64) {
      return Response.json(
        {
          error: "NO_IMAGE_RETURNED",
          message: "Gemini did not return an image."
        },
        { status: 502 }
      );
    }

    return Response.json({
      angle: normalizedAngle,
      imageUrl: `data:image/jpeg;base64,${imageBase64}`,
      model: GEMINI_MODEL,
      imageSize: IMAGE_SIZE
    });
  } catch (error) {
    return Response.json(
      {
        error: "GENERATION_FAILED",
        message:
          error?.message ||
          "We could not generate this try-on. Please try another photo."
      },
      { status: 500 }
    );
  }
}
