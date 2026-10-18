# CyberPrint Pay Firebase scaffold

CyberPrint Pay is surfaced in the existing Paperloop site at `/print`; the homepage links customers into that workflow. The Firebase resources below provide the secure service layer that must be deployed before requests can be accepted by a real counter.

## Included backend surface

| Export | Transport | Authorization | Purpose |
| --- | --- | --- | --- |
| `calculatePrintQuote` | Callable | Any Firebase-authenticated user | Normalizes `all` or `1-3,5` page selections and prices a request from server pricing. |
| `submitJob` | Callable | Any Firebase-authenticated user | Recalculates quote, creates a queue job, and deduplicates by caller + `requestId`. |
| `recordPayment`, `approveJob`, `rejectJob`, `cancelJob` | Callable | `role: "operator"` custom claim | Performs one explicit, audited lifecycle transition. |
| `agentClaim` | HTTPS POST | Enabled agent ID plus bearer secret | Transactionally claims the oldest approved job. |
| `reportAgentResult` | HTTPS POST | Current job claim plus bearer secret | Advances only the claimed job through agent states. |

All state-changing calls require a caller-created UUID-like `requestId`. The function persists the first result in an operation document and returns it for retries. Every successful transition appends an immutable event document.

## State policy

The immutable transition table in `functions/src/domain.ts` permits:

```text
quoted -> submitted -> payment_received -> approved -> claimed
claimed -> converting -> dispatching -> printing -> completed
submitted -> rejected|cancelled
payment_received -> cancelled
claimed|converting|dispatching|printing -> failed_review
```

`failed_review` is terminal in this minimal scaffold. An operator retry should be added later as a dedicated operation that creates a fresh dispatch attempt, not by rewinding a status.

## Setup

1. Create or select a Firebase project and authenticate the Firebase CLI.
2. In this repository run `npm --prefix functions install`.
3. Copy `.env.example` for local emulator use. For deployment, store the agent credential outside source control:

   ```cmd
   firebase functions:secrets:set AGENT_SHARED_SECRET
   ```

4. Create `shops/{shopId}/pricing/active` with integer paise rates, for example:

   ```json
   { "version": "v1", "bwPerSidePaise": 500, "colourPerSidePaise": 1000 }
   ```

5. Mark each Firebase Auth operator with custom claim `{ "role": "operator" }`, create enabled agent documents at `shops/{shopId}/agents/{agentId}`, then deploy:

   ```cmd
   npm --prefix functions run check
   firebase deploy --only functions,firestore:rules,storage
   ```

## Integration requirements and limits

- The browser must establish Firebase Authentication first. Anonymous Auth is suitable for customers, while operators require the custom claim above.
- Upload to `shops/{shopId}/uploads/{uid}/{fileName}` before calling `submitJob`. Storage rules permit only a signed-in owner to create a supported file smaller than 25 MiB. Admin SDK functions retain private access.
- This concise scaffold accepts `pageCount` at quote/submission time. Production must populate it from trusted server-side file analysis before a printable job is approved. Never treat client metadata as proof of a PDF's page count or safety.
- The agent calls each HTTPS endpoint with `Authorization: Bearer <secret>` and `X-CyberPrint-Agent-Id: <agentId>`, JSON body, and a unique `requestId`. Rotate the secret with Firebase Secret Manager and replace this shared-secret bootstrap with per-agent credentials or signed identity tokens before multi-site production.
- `agentClaim` needs the Firestore composite index for `jobs(status ASC, createdAt ASC)` if Firebase requests it at deployment/runtime.

## Files added

- `functions/package.json`, `functions/tsconfig.json`
- `functions/src/domain.ts`, `functions/src/index.ts`
- `firebase.json`, `firestore.rules`, `storage.rules`, `.env.example`
- `docs/CYBERPRINT_FIREBASE_SETUP.md`
