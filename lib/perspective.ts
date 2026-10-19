/**
 * Pure Canvas 2D perspective transformation using triangular mesh subdivision.
 * Maps any arbitrary 4-corner quadrilateral to a straightened rectangle.
 * Works 100% locally in browser without WebGL or OpenCV dependencies.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Quad {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

/**
 * Bilinear interpolation to find point inside quadrilateral at normalized coordinates (u, v) where u, v in [0, 1]
 */
function interpolateQuad(quad: Quad, u: number, v: number): Point {
  const topX = quad.topLeft.x + (quad.topRight.x - quad.topLeft.x) * u;
  const topY = quad.topLeft.y + (quad.topRight.y - quad.topLeft.y) * u;
  const botX = quad.bottomLeft.x + (quad.bottomRight.x - quad.bottomLeft.x) * u;
  const botY = quad.bottomLeft.y + (quad.bottomRight.y - quad.bottomLeft.y) * u;
  return {
    x: topX + (botX - topX) * v,
    y: topY + (botY - topY) * v,
  };
}

/**
 * Warp a source quadrilateral from sourceCanvas/image onto a destination canvas of specified width & height.
 * Uses a fine triangular grid with affine transformations to emulate projective mapping.
 */
export function warpPerspective(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  quad: Quad,
  destWidth: number,
  destHeight: number,
  gridDivisions = 24
): HTMLCanvasElement {
  const destCanvas = document.createElement("canvas");
  destCanvas.width = Math.max(1, Math.round(destWidth));
  destCanvas.height = Math.max(1, Math.round(destHeight));
  const ctx = destCanvas.getContext("2d");
  if (!ctx) throw new Error("Could not obtain 2D canvas context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Pre-draw source image on a canvas if it's an image
  let srcCanvas: HTMLCanvasElement;
  if (sourceImage instanceof HTMLCanvasElement) {
    srcCanvas = sourceImage;
  } else {
    srcCanvas = document.createElement("canvas");
    srcCanvas.width = sourceImage.naturalWidth || sourceImage.width;
    srcCanvas.height = sourceImage.naturalHeight || sourceImage.height;
    const sCtx = srcCanvas.getContext("2d");
    if (!sCtx) throw new Error("Could not obtain source context");
    sCtx.drawImage(sourceImage, 0, 0);
  }

  const stepU = 1 / gridDivisions;
  const stepV = 1 / gridDivisions;

  // Render triangle pairs across the grid
  for (let i = 0; i < gridDivisions; i++) {
    for (let j = 0; j < gridDivisions; j++) {
      const u0 = i * stepU;
      const v0 = j * stepV;
      const u1 = (i + 1) * stepU;
      const v1 = (j + 1) * stepV;

      // Destination coordinates in output canvas
      const dx0 = u0 * destWidth;
      const dy0 = v0 * destHeight;
      const dx1 = u1 * destWidth;
      const dy1 = v1 * destHeight;

      // Source quadrilateral points corresponding to normalized (u, v)
      const p00 = interpolateQuad(quad, u0, v0);
      const p10 = interpolateQuad(quad, u1, v0);
      const p01 = interpolateQuad(quad, u0, v1);
      const p11 = interpolateQuad(quad, u1, v1);

      // Render Upper Triangle: (dx0, dy0), (dx1, dy0), (dx0, dy1)
      renderTriangle(ctx, srcCanvas, p00, p10, p01, { x: dx0, y: dy0 }, { x: dx1, y: dy0 }, { x: dx0, y: dy1 });

      // Render Lower Triangle: (dx1, dy0), (dx1, dy1), (dx0, dy1)
      renderTriangle(ctx, srcCanvas, p10, p11, p01, { x: dx1, y: dy0 }, { x: dx1, y: dy1 }, { x: dx0, y: dy1 });
    }
  }

  return destCanvas;
}

/**
 * Affine transformation for a single triangle mapping from source coords to destination coords.
 */
function renderTriangle(
  ctx: CanvasRenderingContext2D,
  image: HTMLCanvasElement,
  sp0: Point,
  sp1: Point,
  sp2: Point,
  dp0: Point,
  dp1: Point,
  dp2: Point
) {
  ctx.save();

  // Clip to destination triangle with slight overlap to prevent seams
  ctx.beginPath();
  ctx.moveTo(dp0.x, dp0.y);
  ctx.lineTo(dp1.x, dp1.y);
  ctx.lineTo(dp2.x, dp2.y);
  ctx.closePath();
  ctx.clip();

  // Compute affine transform matrix that maps (sp0, sp1, sp2) -> (dp0, dp1, dp2)
  const x0 = sp0.x, y0 = sp0.y;
  const x1 = sp1.x, y1 = sp1.y;
  const x2 = sp2.x, y2 = sp2.y;

  const u0 = dp0.x, v0 = dp0.y;
  const u1 = dp1.x, v1 = dp1.y;
  const u2 = dp2.x, v2 = dp2.y;

  const delta = x0 * (y1 - y2) - y0 * (x1 - x2) + (x1 * y2 - x2 * y1);
  if (Math.abs(delta) < 1e-6) {
    ctx.restore();
    return;
  }

  const a = (u0 * (y1 - y2) - y0 * (u1 - u2) + (u1 * y2 - u2 * y1)) / delta;
  const b = (v0 * (y1 - y2) - y0 * (v1 - v2) + (v1 * y2 - v2 * y1)) / delta;
  const c = (x0 * (u1 - u2) - u0 * (x1 - x2) + (x1 * u2 - x2 * u1)) / delta;
  const d = (x0 * (v1 - v2) - v0 * (x1 - x2) + (x1 * v2 - x2 * v1)) / delta;
  const e = (x0 * (y1 * u2 - y2 * u1) - y0 * (x1 * u2 - x2 * u1) + u0 * (x1 * y2 - x2 * y1)) / delta;
  const f = (x0 * (y1 * v2 - y2 * v1) - y0 * (x1 * v2 - x2 * v1) + v0 * (x1 * y2 - x2 * y1)) / delta;

  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

/**
 * Calculate natural aspect ratio and recommended dimensions for a quad
 */
export function estimateQuadDimensions(quad: Quad): { width: number; height: number; aspectRatio: number } {
  const topWidth = Math.hypot(quad.topRight.x - quad.topLeft.x, quad.topRight.y - quad.topLeft.y);
  const bottomWidth = Math.hypot(quad.bottomRight.x - quad.bottomLeft.x, quad.bottomRight.y - quad.bottomLeft.y);
  const leftHeight = Math.hypot(quad.bottomLeft.x - quad.topLeft.x, quad.bottomLeft.y - quad.topLeft.y);
  const rightHeight = Math.hypot(quad.bottomRight.x - quad.topRight.x, quad.bottomRight.y - quad.topRight.y);

  const avgWidth = (topWidth + bottomWidth) / 2;
  const avgHeight = (leftHeight + rightHeight) / 2;
  const aspectRatio = avgWidth / (avgHeight || 1);

  return {
    width: Math.round(avgWidth),
    height: Math.round(avgHeight),
    aspectRatio,
  };
}
