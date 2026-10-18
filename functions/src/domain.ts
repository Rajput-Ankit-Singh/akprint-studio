export const JOB_STATUSES = [
  "quoted", "submitted", "payment_received", "approved", "rejected", "cancelled",
  "claimed", "converting", "dispatching", "printing", "completed", "failed_review",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];
export type PrintMode = "bw" | "colour";

const ALLOWED_TRANSITIONS: Readonly<Record<JobStatus, readonly JobStatus[]>> = {
  quoted: ["submitted", "cancelled"],
  submitted: ["payment_received", "rejected", "cancelled"],
  payment_received: ["approved", "cancelled"],
  approved: ["claimed"],
  rejected: [],
  cancelled: [],
  claimed: ["converting", "failed_review"],
  converting: ["dispatching", "failed_review"],
  dispatching: ["printing", "failed_review"],
  printing: ["completed", "failed_review"],
  completed: [],
  failed_review: [],
};

export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transition ${from} -> ${to} is not allowed`);
  }
}

export function normalizePages(selection: string, pageCount: number): number[] {
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 10_000) {
    throw new Error("pageCount must be an integer from 1 to 10000");
  }
  if (selection.trim().toLowerCase() === "all") {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const pages = new Set<number>();
  for (const token of selection.split(",").map((part) => part.trim())) {
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token);
    if (!match) throw new Error(`Invalid page range token: ${token || "(empty)"}`);
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start > end || start < 1 || end > pageCount) throw new Error("Page range is outside the document");
    for (let page = start; page <= end; page += 1) {
      if (pages.has(page)) throw new Error(`Page ${page} appears more than once`);
      pages.add(page);
    }
  }
  if (pages.size === 0) throw new Error("Select at least one page");
  return [...pages].sort((a, b) => a - b);
}

export function calculateQuote(input: {
  pageSelection: string;
  pageCount: number;
  copies: number;
  printMode: PrintMode;
  bwPerSidePaise: number;
  colourPerSidePaise: number;
}) {
  if (!Number.isInteger(input.copies) || input.copies < 1 || input.copies > 100) {
    throw new Error("copies must be an integer from 1 to 100");
  }
  const pages = normalizePages(input.pageSelection, input.pageCount);
  const unitPricePaise = input.printMode === "bw" ? input.bwPerSidePaise : input.colourPerSidePaise;
  if (!Number.isInteger(unitPricePaise) || unitPricePaise < 0) throw new Error("Invalid shop pricing");
  const printedSides = pages.length * input.copies;
  return { pages, printedSides, unitPricePaise, totalPaise: printedSides * unitPricePaise };
}
