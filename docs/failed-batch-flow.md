# Failed batch flow

How a batch that fails is handled, from the failure to resolution. This describes the current prototype: all state is in localStorage and the batches are seeded demo data.

## 1. A batch fails

- A batch moves through `pending → rendering → review → approved → dispatching → completed`. Zip and SFTP batches skip `pending`. Batches that don't need review skip `review` and `approved`.
- It can fail at rendering, review, approved or dispatching. The stage is stored as `failedStage` and the batch state becomes `failed`.
- Each failure is a failure item (`BatchFailureItem` in `src/lib/types.ts`) with a level (whole batch or one invoice), a stage, a message and a type:

| Type | Meaning | Examples |
|---|---|---|
| Temporary (`transient`) | A system or network problem | Renderer unavailable, SFTP handshake, SMTP timeout |
| Delivery (`delivery`) | The recipient could not be reached | Mailbox rejected, full or missing; recipient domain rejected |
| Invoice data (`data`) | The invoice itself is invalid | Missing field, invalid VAT ID, malformed XML |

- The batch appears in the Failed tab and is counted in the navbar alert.
- Failure items saved before types existed have no `category`. `getFailureItems` treats them as invoice data.

## 2. The user opens the failed batch

The detail page shows:

- The stepper, with the failed stage in red and a note such as "2 invoices failed".
- A "How to fix this batch" alert with one line of advice per failure type present (`src/components/failure-list.tsx`).
- The invoice table, with each failed invoice's reason.

## 3. Send what worked

Available only when some invoices rendered:

1. If the organization requires review, the user first clicks **Approve rendered invoices** (`remainingApproved`).
2. The user clicks **Dispatch** and ticks the confirmation that only the successful invoices will be sent.
3. The rendered invoices are sent. The batch is marked `partiallyDispatched` and moves to **Partially completed**, so users can distinguish it from a batch where nothing was sent.
4. The failed invoices were never sent. They wait for step 4.

## 4. Fix the failed invoices

Today the fix happens outside the app:

- **Temporary:** retry later. There is no retry button yet.
- **Delivery:** check the address or channel. There is no edit-recipient action yet.
- **Invoice data:** get a corrected invoice and re-send it in a new batch with the same OCR number as the original. The new batch records those numbers as `reuploadOcr`.

## 5. The app finds the fixes

`getResolutionCandidates` in `src/lib/store.ts`:

- Runs for both `failed` and `partial` batches.
- Looks at dispatched replacement batches from the same organization, regardless of whether they arrived through FTP, SFTP, watched folder, manual upload, or another connector.
- Uses normalized OCR plus organization as required identity checks. Customer, recipient, gross amount and currency are shown as validation checks, with exact discrepancies.
- Matches are suggestions. Nothing resolves automatically.

The failed batch lists them in a "Fixes received" table. The batch that re-sends the invoices shows an info alert pointing back to the failed batch. Both are in `src/components/resolution-panel.tsx`.

## 6. A person confirms

- The user checks each eligible match and clicks **Confirm**, or **Confirm all** when there are several. OCR or organization mismatches cannot be confirmed.
- `confirmResolutions` writes a permanent `Resolution` record: OCR number, failed invoice and reason, replacement invoice, batch and source, all validation checks, who confirmed and when.
- `confirmedBy` is hard-coded to `"jfern"`.

## 7. The batch is resolved

- When no failed invoice is left without a confirmed match, the batch becomes `resolved` and gets `resolvedAt`.
- It leaves the Failed tab and appears in Resolved. Its detail page shows the permanent Resolution record.

## Not built yet

- Retry for temporary failures and edit-recipient for delivery failures.
- Dismissing a failure that cannot be fixed. Without it, a batch whose fix never arrives stays in Action required forever.
- Matching by hand when the OCR numbers differ.
- A signed-in user for confirmations, and a backend instead of localStorage. The available sources and OCR field values are simulated prototype data; no live FTP/SFTP or folder process is connected.
