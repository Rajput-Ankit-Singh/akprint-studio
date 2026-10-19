import { PDFDocument, rgb, degrees } from "pdf-lib";

export interface PdfImageItem {
  name: string;
  bytes: Uint8Array;
  mimeType: string;
}

export interface PdfExportOptions {
  pageSize?: "A4" | "4x6" | "Letter";
  orientation?: "portrait" | "landscape";
  marginMm?: number;
  fitToPage?: boolean;
}

const PAGE_SIZES: Record<string, [number, number]> = {
  // dimensions in points (72 points per inch)
  A4: [595.28, 841.89], // 210 x 297 mm
  "4x6": [288, 432],    // 4 x 6 inches
  Letter: [612, 792],   // 8.5 x 11 inches
};

export async function imagesToPdf(
  images: { dataUrl: string; name?: string }[],
  options: PdfExportOptions = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const baseSize = PAGE_SIZES[options.pageSize || "A4"];
  const isLandscape = options.orientation === "landscape";
  const [pageW, pageH] = isLandscape ? [baseSize[1], baseSize[0]] : [baseSize[0], baseSize[1]];
  const marginPt = ((options.marginMm ?? 10) * 72) / 25.4;

  for (const img of images) {
    const isPng = img.dataUrl.startsWith("data:image/png");
    const base64Data = img.dataUrl.split(",")[1];
    if (!base64Data) continue;

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const embeddedImage = isPng
      ? await pdfDoc.embedPng(bytes)
      : await pdfDoc.embedJpg(bytes);

    const page = pdfDoc.addPage([pageW, pageH]);
    const availableW = pageW - marginPt * 2;
    const availableH = pageH - marginPt * 2;

    const imgAspect = embeddedImage.width / embeddedImage.height;
    const pageAspect = availableW / availableH;

    let drawW: number;
    let drawH: number;

    if (imgAspect > pageAspect) {
      drawW = availableW;
      drawH = availableW / imgAspect;
    } else {
      drawH = availableH;
      drawW = availableH * imgAspect;
    }

    const x = marginPt + (availableW - drawW) / 2;
    const y = marginPt + (availableH - drawH) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawW,
      height: drawH,
    });
  }

  return await pdfDoc.save();
}

export async function mergePdfs(pdfBuffers: ArrayBuffer[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const doc = await PDFDocument.load(buffer);
    const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  return await mergedPdf.save();
}

export async function extractOrDeletePdfPages(
  pdfBuffer: ArrayBuffer,
  keepPageNumbers1Indexed: number[]
): Promise<Uint8Array> {
  const sourceDoc = await PDFDocument.load(pdfBuffer);
  const targetDoc = await PDFDocument.create();

  const totalPages = sourceDoc.getPageCount();
  const validIndices = keepPageNumbers1Indexed
    .map((num) => num - 1)
    .filter((idx) => idx >= 0 && idx < totalPages);

  const copiedPages = await targetDoc.copyPages(sourceDoc, validIndices);
  for (const page of copiedPages) {
    targetDoc.addPage(page);
  }

  return await targetDoc.save();
}

export async function rotatePdfPages(
  pdfBuffer: ArrayBuffer,
  rotationAngle: 90 | 180 | 270,
  pageNumbers1Indexed?: number[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBuffer);
  const totalPages = doc.getPageCount();
  const targetIndices = new Set(
    pageNumbers1Indexed
      ? pageNumbers1Indexed.map((n) => n - 1).filter((n) => n >= 0 && n < totalPages)
      : doc.getPageIndices()
  );

  doc.getPages().forEach((page, index) => {
    if (targetIndices.has(index)) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + rotationAngle) % 360));
    }
  });

  return await doc.save();
}

export async function getPdfPageCount(pdfBuffer: ArrayBuffer): Promise<number> {
  const doc = await PDFDocument.load(pdfBuffer);
  return doc.getPageCount();
}

export function createPdfBlob(pdfBytes: Uint8Array): Blob {
  return new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
}
