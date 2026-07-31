"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const sizes = ["S", "M", "L", "XL", "XXL"];

const waitSlides = [
  {
    kicker: "STYLE NOTE",
    title: "Oversized shirts need balance",
    text: "The AI is preserving the loose crop-shirt fit, then checking how the hem sits against your frame."
  },
  {
    kicker: "TREND WATCH",
    title: "Monochrome graphics are trending",
    text: "Black-and-white illustrated shirts pair strongest with faded denim, cargos, or clean black trousers."
  },
  {
    kicker: "FIT DETAIL",
    title: "The collar changes the attitude",
    text: "A slightly open collar makes this shirt read more street-resort and less formal."
  },
  {
    kicker: "AI CHECK",
    title: "Preserving the product",
    text: "Gemini is matching the Roman print, button line, collar, sleeve length, and white fabric tone."
  },
  {
    kicker: "SHOPPING TIP",
    title: "Look at sleeve drop first",
    text: "For relaxed shirts, sleeve drop is the quickest signal of whether the silhouette feels intentional."
  }
];

const generationStages = [
  "Reading your photo",
  "Mapping shirt fit",
  "Preserving print details",
  "Rendering final look"
];

const angles = ["front", "right", "back"];

const angleLabels = {
  front: "Front",
  right: "Right",
  back: "Back"
};

const samplePersonUrl = "https://storage.googleapis.com/falserverless/example_inputs/model.png";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImage(dataUrl, maxSide = 1500, quality = 0.86) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export default function Home() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState("intro");
  const [selectedSize, setSelectedSize] = useState("M");
  const [uploadPreview, setUploadPreview] = useState("");
  const [uploadData, setUploadData] = useState("");
  const [sampleImageUrl, setSampleImageUrl] = useState("");
  const [resultImages, setResultImages] = useState({});
  const [angleStatus, setAngleStatus] = useState({});
  const [activeAngle, setActiveAngle] = useState("front");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [demoMode, setDemoMode] = useState(false);
  const fileInputRef = useRef(null);

  const ctaLabel = useMemo(() => {
    if (step === "intro") return "Start Try On";
    if (step === "upload") return uploadData ? "Generate Look" : "Upload Photo";
    if (step === "processing") return "Generating...";
    if (step === "result") return "Add to Cart";
    return "Try Again";
  }, [step, uploadData]);

  useEffect(() => {
    if (step !== "processing") return;
    const interval = window.setInterval(() => {
      setQuoteIndex((current) => (current + 1) % waitSlides.length);
    }, 3600);
    return () => window.clearInterval(interval);
  }, [step]);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", sheetOpen);
    return () => document.body.classList.remove("no-scroll");
  }, [sheetOpen]);

  function openSheet() {
    setSheetOpen(true);
    setStep("intro");
    setError("");
  }

  function closeSheet() {
    setSheetOpen(false);
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    setError("");
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Upload a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image is too large. Upload an image under 10 MB.");
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    const compressed = await compressImage(dataUrl);
    setUploadPreview(dataUrl);
    setUploadData(compressed);
    setSampleImageUrl("");
  }

  function useSamplePhoto() {
    setError("");
    setUploadPreview(samplePersonUrl);
    setUploadData("sample");
    setSampleImageUrl(samplePersonUrl);
  }

  async function generateAngle(angle) {
    const response = await fetch("/api/tryon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        sampleImageUrl
          ? { imageUrl: sampleImageUrl, angle }
          : { imageDataUrl: uploadData, angle }
      )
    });
    const payload = await response.json();
    if (!response.ok || !payload.imageUrl) {
      throw new Error(payload.message || "Generation failed");
    }
    return payload.imageUrl;
  }

  async function generateBackgroundAngle(angle) {
    setAngleStatus((current) => ({ ...current, [angle]: "loading" }));
    try {
      const imageUrl = await generateAngle(angle);
      setResultImages((current) => ({ ...current, [angle]: imageUrl }));
      setAngleStatus((current) => ({ ...current, [angle]: "ready" }));
    } catch (err) {
      setAngleStatus((current) => ({ ...current, [angle]: "failed" }));
    }
  }

  async function generateTryOn() {
    if (!uploadData) {
      fileInputRef.current?.click();
      return;
    }

    setStep("processing");
    setQuoteIndex(0);
    setError("");
    setDemoMode(false);
    setSaved(false);
    setActiveAngle("front");
    setResultImages({});
    setAngleStatus({ front: "loading", right: "queued", back: "queued" });

    try {
      const frontImageUrl = await generateAngle("front");
      setResultImages({ front: frontImageUrl });
      setAngleStatus({ front: "ready", right: "loading", back: "queued" });
      setSaved(true);
      setStep("result");
      generateBackgroundAngle("right");
      window.setTimeout(() => generateBackgroundAngle("back"), 1200);
    } catch (err) {
      setDemoMode(true);
      setResultImages({ front: "/assets/result-reference.png" });
      setAngleStatus({ front: "ready", right: "failed", back: "failed" });
      setSaved(true);
      setStep("result");
      setError(
        "Live AI generation failed, so the prototype is showing a demo result for presentation continuity."
      );
    }
  }

  function handlePrimary() {
    if (step === "intro") {
      setStep("upload");
      return;
    }
    if (step === "upload") {
      generateTryOn();
      return;
    }
    if (step === "result") {
      setSheetOpen(false);
      window.setTimeout(() => {
        window.alert(`Added Roman Empire Crop Shirt - ${selectedSize} to cart.`);
      }, 250);
    }
  }

  async function handleShare() {
    const resultImage = resultImages[activeAngle] || resultImages.front || "/assets/result-reference.png";
    const url = resultImage.startsWith("http") ? resultImage : window.location.origin + resultImage;
    if (navigator.share) {
      await navigator.share({
        title: "My Trendzila AI Try On",
        text: "Dashing look in the Roman Empire Crop Shirt.",
        url
      });
      return;
    }
    await navigator.clipboard.writeText(url);
    window.alert("Result link copied.");
  }

  return (
    <main className="page-shell">
      <section className="phone">
        <div className="promo">NEW DROP - NOW LIVE</div>
        <header className="header">
          <button className="text-button">MENU</button>
          <div className="logo">TRENDZILA</div>
          <button className="search" aria-label="Search" />
        </header>

        <nav className="crumb">
          <span>HOME</span>
          <span>›</span>
          <span>ROMAN EMPIRE CROP SHIRT</span>
        </nav>

        <section className="gallery">
          <img src="/assets/product-front.webp" alt="Roman Empire Crop Shirt front" />
        </section>

        <section className="product-info">
          <div>
            <h1>ROMAN EMPIRE CROP SHIRT</h1>
            <p>RS. 1,199.00</p>
          </div>
          <button className="size-chart">SIZE CHART</button>
        </section>

        <section className="size-grid" aria-label="Select size">
          {sizes.map((size) => (
            <button
              key={size}
              className={selectedSize === size ? "active" : ""}
              onClick={() => setSelectedSize(size)}
            >
              {size}
            </button>
          ))}
        </section>

        <button className="tryon-button" onClick={openSheet}>
          <span>✦</span>
          AI Try On
        </button>

        {sheetOpen && <button className="overlay" aria-label="Close try-on" onClick={closeSheet} />}

        <section className={`sheet ${sheetOpen ? "open" : ""}`} aria-hidden={!sheetOpen}>
          <div className="handle" />
          <button className="close" onClick={closeSheet} aria-label="Close">
            ×
          </button>

          {step === "intro" && (
            <div className="sheet-content intro">
              <div className="intro-visual">
                <img src="/assets/intro-tryon.png" alt="AI try on preview" />
              </div>
              <h2>See this shirt on you before you buy.</h2>
              <div className="step-list">
                <div>
                  <b>1</b>
                  <span>Upload a half or full length photo</span>
                </div>
                <div>
                  <b>2</b>
                  <span>We show you exactly how clothes will look on you</span>
                </div>
              </div>
            </div>
          )}

          {step === "upload" && (
            <div className="sheet-content upload">
              <h2>Use a clear half-length or full-length photo</h2>
              <div className="chips">
                <span className="good">✓ Head to waist visible</span>
                <span className="bad">× Cropped shoulders only</span>
              </div>
              <button className={`upload-box ${uploadPreview ? "has-image" : ""}`} onClick={() => fileInputRef.current?.click()}>
                {uploadPreview ? (
                  <img src={uploadPreview} alt="Uploaded try on source" />
                ) : (
                  <>
                    <strong>+</strong>
                    <b>Tap to upload</b>
                    <span>Face and torso visible, good light, no heavy filters.</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                className="file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
              />
              {error && <p className="error">{error}</p>}
              {uploadPreview && (
                <button className="secondary" onClick={() => fileInputRef.current?.click()}>
                  Choose another photo
                </button>
              )}
              {!uploadPreview && (
                <button className="secondary" onClick={useSamplePhoto}>
                  Use sample photo
                </button>
              )}
            </div>
          )}

          {step === "processing" && (
            <div className="sheet-content processing">
              <div className="processing-head">
                <span>AI TRY ON IN PROGRESS</span>
                <h2>Styling your Roman Empire look</h2>
              </div>
              <div className="spinner" aria-label="Processing your pictures">
                {Array.from({ length: 12 }).map((_, index) => (
                  <i key={index} style={{ "--i": index }} />
                ))}
              </div>
              <h3>Processing Your Pictures</h3>
              <div className="stage-list">
                {generationStages.map((stage, index) => (
                  <div
                    className={index <= quoteIndex % generationStages.length ? "active" : ""}
                    key={stage}
                  >
                    <span>{index + 1}</span>
                    {stage}
                  </div>
                ))}
              </div>
              <div className="wait-card">
                <span>{waitSlides[quoteIndex].kicker}</span>
                <strong>{waitSlides[quoteIndex].title}</strong>
                <p>{waitSlides[quoteIndex].text}</p>
                <div className="wait-dots" aria-label="Style notes progress">
                  {waitSlides.map((slide, index) => (
                    <i className={index === quoteIndex ? "active" : ""} key={slide.title} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "result" && (
            <div className="sheet-content result">
              <div className="result-head">
                <h2>Dashing Look!</h2>
                <span className="saved">✓ {saved ? "Saved" : "Saving"}</span>
                <button onClick={handleShare}>Share ↗</button>
              </div>
              {demoMode && <p className="demo-note">{error}</p>}
              <div className="angle-tabs" aria-label="Try-on angle selector">
                {angles.map((angle) => (
                  <button
                    className={activeAngle === angle ? "active" : ""}
                    key={angle}
                    onClick={() => setActiveAngle(angle)}
                  >
                    {angleLabels[angle]}
                    {angleStatus[angle] === "loading" && <span>Generating</span>}
                    {angleStatus[angle] === "queued" && <span>Queued</span>}
                    {angleStatus[angle] === "failed" && <span>Retry later</span>}
                  </button>
                ))}
              </div>
              <div className="result-image">
                {resultImages[activeAngle] ? (
                  <img
                    src={resultImages[activeAngle]}
                    alt={`${angleLabels[activeAngle]} generated AI try on result`}
                  />
                ) : (
                  <div className="angle-loading">
                    <div className="mini-spinner" />
                    <strong>{angleLabels[activeAngle]} view is generating</strong>
                    <span>You can keep viewing the front result while this finishes.</span>
                  </div>
                )}
              </div>
              <div className="angle-nav">
                <button
                  onClick={() =>
                    setActiveAngle(
                      (current) =>
                        angles[(angles.indexOf(current) + angles.length - 1) % angles.length]
                    )
                  }
                  aria-label="Previous try-on angle"
                >
                  ←
                </button>
                <span>{angleLabels[activeAngle]} view</span>
                <button
                  onClick={() =>
                    setActiveAngle(
                      (current) => angles[(angles.indexOf(current) + 1) % angles.length]
                    )
                  }
                  aria-label="Next try-on angle"
                >
                  →
                </button>
              </div>
            </div>
          )}

          <button
            className="primary"
            disabled={step === "processing" || (step === "upload" && !uploadData)}
            onClick={handlePrimary}
          >
            {ctaLabel}
          </button>
        </section>
      </section>
    </main>
  );
}
