/**
 * Core image processing utilities:
 * - Resizing and DPI unit conversion (mm, cm, inch, px)
 * - Brightness, contrast, grayscale filters
 * - Background color detection and replacement (solid studio blue, white, custom)
 * - Target-KB compression binary search
 */

export interface ResizeOptions {
  widthPx: number;
  heightPx: number;
  format?: "image/jpeg" | "image/png" | "image/webp";
  quality?: number; // 0.0 - 1.0
  brightness?: number; // 100 default
  contrast?: number; // 100 default
  grayscale?: boolean;
}

export function mmToPx(mm: number, dpi = 300): number {
  return Math.round((mm / 25.4) * dpi);
}

export function cmToPx(cm: number, dpi = 300): number {
  return Math.round((cm / 2.54) * dpi);
}

export function inToPx(inches: number, dpi = 300): number {
  return Math.round(inches * dpi);
}

export function pxToMm(px: number, dpi = 300): number {
  return Number(((px * 25.4) / dpi).toFixed(1));
}

/**
 * Render image to canvas with custom filters and dimensions
 */
export async function processImage(
  imageSource: HTMLImageElement | string,
  options: ResizeOptions
): Promise<HTMLCanvasElement> {
  let img: HTMLImageElement;
  if (typeof imageSource === "string") {
    img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSource;
    await img.decode();
  } else {
    img = imageSource;
  }

  const canvas = document.createElement("canvas");
  canvas.width = options.widthPx;
  canvas.height = options.heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // White background by default for JPEG exports
  if (options.format !== "image/png") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const brightness = options.brightness ?? 100;
  const contrast = options.contrast ?? 100;
  const grayscale = options.grayscale ? "grayscale(100%) " : "";

  ctx.filter = `${grayscale}brightness(${brightness}%) contrast(${contrast}%)`;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return canvas;
}

/**
 * Replace background color using edge-sampled flood or color distance threshold.
 * Useful for turning background into studio white (#FFFFFF), studio blue (#2B6CB0), etc.
 */
export function replaceBackgroundColor(
  sourceCanvas: HTMLCanvasElement,
  targetColorHex: string,
  threshold = 32
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Sample top-left and top-right corners to estimate background color
  const sampleR = (data[0] + data[(canvas.width - 1) * 4]) / 2;
  const sampleG = (data[1] + data[(canvas.width - 1) * 4 + 1]) / 2;
  const sampleB = (data[2] + data[(canvas.width - 1) * 4 + 2]) / 2;

  // Parse target color
  const hex = targetColorHex.replace("#", "");
  const targetR = parseInt(hex.substring(0, 2), 16) || 255;
  const targetG = parseInt(hex.substring(2, 4), 16) || 255;
  const targetB = parseInt(hex.substring(4, 6), 16) || 255;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dist = Math.sqrt(
      Math.pow(r - sampleR, 2) + Math.pow(g - sampleG, 2) + Math.pow(b - sampleB, 2)
    );

    if (dist < threshold) {
      data[i] = targetR;
      data[i + 1] = targetG;
      data[i + 2] = targetB;
      // keep alpha solid
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Compress canvas to Blob meeting a strict target size in KB
 */
export async function compressToTargetKb(
  canvas: HTMLCanvasElement,
  targetKb: number,
  initialQuality = 0.92,
  minQuality = 0.15
): Promise<{ blob: Blob; sizeKb: number; quality: number }> {
  let low = minQuality;
  let high = initialQuality;
  let bestBlob: Blob | null = null;
  let bestQuality = initialQuality;

  // Check initial quality first
  const initialBlob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/jpeg", initialQuality)
  );

  if (!initialBlob) throw new Error("Could not create image blob");
  const initialKb = initialBlob.size / 1024;

  if (targetKb <= 0 || initialKb <= targetKb) {
    return { blob: initialBlob, sizeKb: Math.round(initialKb), quality: initialQuality };
  }

  // Binary search for quality that fits under targetKb
  for (let iteration = 0; iteration < 8; iteration++) {
    const mid = (low + high) / 2;
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", mid)
    );
    if (!blob) break;

    const currentKb = blob.size / 1024;
    if (currentKb <= targetKb) {
      bestBlob = blob;
      bestQuality = mid;
      low = mid; // try to get higher quality that still fits
    } else {
      high = mid; // too big, lower quality
    }
  }

  if (!bestBlob) {
    bestBlob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", minQuality)
    );
    bestQuality = minQuality;
  }

  const finalSizeKb = Math.round((bestBlob?.size ?? 0) / 1024);
  return {
    blob: bestBlob!,
    sizeKb: finalSizeKb,
    quality: Number(bestQuality.toFixed(2)),
  };
}
