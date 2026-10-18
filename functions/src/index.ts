import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { logger } from "firebase-functions";
import type { Request, Response } from "express";
import { assertTransition, calculateQuote, type JobStatus, type PrintMode } from "./domain.js";

initializeApp();
const db = getFirestore();
const region = process.env.FUNCTION_REGION ?? "asia-south1";
const agentSharedSecret = defineString("AGENT_SHARED_SECRET");
const json = (value: unknown) => JSON.parse(JSON.stringify(value));

type Pricing = { bwPerSidePaise: number; colourPerSidePaise: number; version: string };
type Job = { status: JobStatus; ownerUid: string; claim?: { agentId: string; claimId: string }; [key: string]: unknown };

function data(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpsError("invalid-argument", "Object input is required");
  return value as Record<string, unknown>;
}
function string(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new HttpsError("invalid-argument", `${name} is required`);
  return value.trim();
}
function requireUser(uid: string | undefined): string {
  if (!uid) throw new HttpsError("unauthenticated", "Sign-in is required");
  return uid;
}
function requireOperator(auth: { uid: string; token: Record<string, unknown> } | undefined): string {
  if (!auth || auth.token.role !== "operator") throw new HttpsError("permission-denied", "Operator role is required");
  return auth.uid;
}
async function pricingFor(shopId: string): Promise<Pricing> {
  const snapshot = await db.doc(`shops/${shopId}/pricing/active`).get();
  if (!snapshot.exists) throw new HttpsError("failed-precondition", "Active shop pricing is not configured");
  const value = snapshot.data()!;
  if (!Number.isInteger(value.bwPerSidePaise) || !Number.isInteger(value.colourPerSidePaise)) {
    throw new HttpsError("failed-precondition", "Active shop pricing is invalid");
  }
  return { bwPerSidePaise: value.bwPerSidePaise, colourPerSidePaise: value.colourPerSidePaise, version: String(value.version ?? "active") };
}
function operationRef(shopId: string, jobId: string, requestId: string) {
  return db.doc(`shops/${shopId}/jobs/${jobId}/operations/${requestId}`);
}
async function transition(input: { shopId: string; jobId: string; requestId: string; actor: { type: "operator" | "agent"; id: string }; to: JobStatus; patch?: Record<string, unknown> }) {
  const jobRef = db.doc(`shops/${input.shopId}/jobs/${input.jobId}`);
  const opRef = operationRef(input.shopId, input.jobId, input.requestId);
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(opRef);
    if (existing.exists) return json(existing.data()!.result);
    const jobSnapshot = await tx.get(jobRef);
    if (!jobSnapshot.exists) throw new HttpsError("not-found", "Job not found");
    const job = jobSnapshot.data() as Job;
    try { assertTransition(job.status, input.to); } catch (error) { throw new HttpsError("failed-precondition", (error as Error).message); }
    const now = Timestamp.now();
    const result = { jobId: input.jobId, previousStatus: job.status, status: input.to };
    tx.update(jobRef, { status: input.to, ...input.patch, updatedAt: now, version: FieldValue.increment(1) });
    tx.create(db.collection(`${jobRef.path}/events`).doc(), { eventType: "status_transition", previousStatus: job.status, nextStatus: input.to, actorType: input.actor.type, actorId: input.actor.id, requestId: input.requestId, at: now, metadata: input.patch ?? {} });
    tx.create(opRef, { result, createdAt: now, requestId: input.requestId });
    return result;
  });
}

export const calculatePrintQuote = onCall({ region }, async (request) => {
  requireUser(request.auth?.uid);
  const input = data(request.data);
  const shopId = string(input.shopId, "shopId");
  const pricing = await pricingFor(shopId);
  try {
    return { ...calculateQuote({ pageSelection: string(input.pageSelection, "pageSelection"), pageCount: Number(input.pageCount), copies: Number(input.copies), printMode: string(input.printMode, "printMode") as PrintMode, ...pricing }), pricingVersion: pricing.version };
  } catch (error) { throw new HttpsError("invalid-argument", (error as Error).message); }
});

export const submitJob = onCall({ region }, async (request) => {
  const ownerUid = requireUser(request.auth?.uid);
  const input = data(request.data);
  const shopId = string(input.shopId, "shopId");
  const requestId = string(input.requestId, "requestId");
  const idempotencyRef = db.doc(`shops/${shopId}/submissionRequests/${createHash("sha256").update(`${ownerUid}:${requestId}`).digest("hex")}`);
  const pricing = await pricingFor(shopId);
  let quote: ReturnType<typeof calculateQuote>;
  try { quote = calculateQuote({ pageSelection: string(input.pageSelection, "pageSelection"), pageCount: Number(input.pageCount), copies: Number(input.copies), printMode: string(input.printMode, "printMode") as PrintMode, ...pricing }); }
  catch (error) { throw new HttpsError("invalid-argument", (error as Error).message); }
  return db.runTransaction(async (tx) => {
    const prior = await tx.get(idempotencyRef);
    if (prior.exists) return json(prior.data()!.result);
    const jobRef = db.collection(`shops/${shopId}/jobs`).doc();
    const queueNumber = `CP-${jobRef.id.slice(0, 6).toUpperCase()}`;
    const now = Timestamp.now();
    const file = data(input.file);
    const result = { jobId: jobRef.id, queueNumber, status: "submitted" as const, quote: { ...quote, pricingVersion: pricing.version } };
    tx.create(jobRef, { ...result, ownerUid, request: { pageSelection: input.pageSelection, pages: quote.pages, copies: Number(input.copies), printMode: input.printMode, pageCount: Number(input.pageCount) }, originalFile: { storagePath: string(file.storagePath, "file.storagePath"), originalName: string(file.originalName, "file.originalName"), mimeType: string(file.mimeType, "file.mimeType"), bytes: Number(file.bytes) }, createdAt: now, updatedAt: now, version: 1 });
    tx.create(db.collection(`${jobRef.path}/events`).doc(), { eventType: "job_submitted", previousStatus: "quoted", nextStatus: "submitted", actorType: "customer", actorId: ownerUid, requestId, at: now, metadata: {} });
    tx.create(idempotencyRef, { result, createdAt: now, ownerUid });
    return result;
  });
});

export const recordPayment = onCall({ region }, async (request) => {
  const actorId = requireOperator(request.auth as never); const input = data(request.data);
  const paymentMethod = string(input.paymentMethod, "paymentMethod");
  if (!["cash", "upi"].includes(paymentMethod)) throw new HttpsError("invalid-argument", "paymentMethod must be cash or upi");
  return transition({ shopId: string(input.shopId, "shopId"), jobId: string(input.jobId, "jobId"), requestId: string(input.requestId, "requestId"), actor: { type: "operator", id: actorId }, to: "payment_received", patch: { approval: { paymentMethod, paymentReceivedAt: Timestamp.now(), receivedBy: actorId } } });
});

function operatorAction(to: "approved" | "rejected" | "cancelled") {
  return onCall({ region }, async (request) => {
    const actorId = requireOperator(request.auth as never); const input = data(request.data);
    const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 500) : undefined;
    if ((to === "rejected" || to === "cancelled") && !reason) throw new HttpsError("invalid-argument", "reason is required");
    return transition({ shopId: string(input.shopId, "shopId"), jobId: string(input.jobId, "jobId"), requestId: string(input.requestId, "requestId"), actor: { type: "operator", id: actorId }, to, patch: to === "approved" ? { approval: { approvedBy: actorId, approvedAt: Timestamp.now() } } : { resolution: { reason, by: actorId, at: Timestamp.now() } } });
  });
}
export const approveJob = operatorAction("approved");
export const rejectJob = operatorAction("rejected");
export const cancelJob = operatorAction("cancelled");

function authorizeAgent(request: Request): string {
  const agentId = request.header("x-cyberprint-agent-id");
  const supplied = request.header("authorization")?.replace(/^Bearer\s+/i, "");
  const expected = agentSharedSecret.value();
  if (!agentId || !supplied || !expected || supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) throw new HttpsError("unauthenticated", "Valid agent credentials are required");
  return agentId;
}
function agentError(response: Response, error: unknown): void {
  const message = error instanceof HttpsError ? error.message : "Internal server error";
  response.status(error instanceof HttpsError && error.code === "unauthenticated" ? 401 : 400).json({ error: message });
}
export const agentClaim = onRequest({ region }, async (request, response) => {
  if (request.method !== "POST") { response.status(405).json({ error: "POST required" }); return; }
  try {
    const agentId = authorizeAgent(request); const input = data(request.body); const shopId = string(input.shopId, "shopId"); const requestId = string(input.requestId, "requestId");
    const agentRef = db.doc(`shops/${shopId}/agents/${agentId}`);
    const claimRequestRef = db.doc(`shops/${shopId}/agentClaimRequests/${createHash("sha256").update(`${agentId}:${requestId}`).digest("hex")}`);
    const result = await db.runTransaction(async (tx) => {
      const prior = await tx.get(claimRequestRef);
      if (prior.exists) return json(prior.data()!.result);
      const agent = await tx.get(agentRef); if (!agent.exists || agent.data()!.enabled !== true) throw new HttpsError("permission-denied", "Agent is not enabled");
      const candidates = await tx.get(db.collection(`shops/${shopId}/jobs`).where("status", "==", "approved").orderBy("createdAt").limit(1));
      if (candidates.empty) {
        tx.create(claimRequestRef, { result: null, createdAt: Timestamp.now(), agentId, requestId });
        return null;
      }
      const jobRef = candidates.docs[0].ref; const job = candidates.docs[0].data() as Job; const claimId = randomUUID(); const now = Timestamp.now();
      tx.update(jobRef, { status: "claimed", claim: { agentId, claimId, claimedAt: now }, updatedAt: now, version: FieldValue.increment(1) });
      tx.create(db.collection(`${jobRef.path}/events`).doc(), { eventType: "agent_claimed", previousStatus: job.status, nextStatus: "claimed", actorType: "agent", actorId: agentId, requestId, at: now, metadata: { claimId } });
      const claimed = { jobId: jobRef.id, claimId, job: json(job) };
      tx.create(claimRequestRef, { result: claimed, createdAt: now, agentId, requestId });
      return claimed;
    });
    response.json({ result });
  } catch (error) { agentError(response, error); }
});

export const reportAgentResult = onRequest({ region }, async (request, response) => {
  if (request.method !== "POST") { response.status(405).json({ error: "POST required" }); return; }
  try {
    const agentId = authorizeAgent(request); const input = data(request.body); const to = string(input.status, "status") as JobStatus;
    if (!["converting", "dispatching", "printing", "completed", "failed_review"].includes(to)) throw new HttpsError("invalid-argument", "Unsupported agent result status");
    const shopId = string(input.shopId, "shopId"); const jobId = string(input.jobId, "jobId"); const claimId = string(input.claimId, "claimId");
    const job = await db.doc(`shops/${shopId}/jobs/${jobId}`).get();
    if (!job.exists || (job.data() as Job).claim?.agentId !== agentId || (job.data() as Job).claim?.claimId !== claimId) throw new HttpsError("permission-denied", "This agent does not hold the job claim");
    const result = await transition({ shopId, jobId, requestId: string(input.requestId, "requestId"), actor: { type: "agent", id: agentId }, to, patch: { result: { reportedAt: Timestamp.now(), code: typeof input.code === "string" ? input.code.slice(0, 100) : null, physicalOutcome: typeof input.physicalOutcome === "string" ? input.physicalOutcome.slice(0, 100) : null } } });
    response.json({ result });
  } catch (error) { logger.warn("agent result rejected", error); agentError(response, error); }
});
