import { defaultDesign } from "@/lib/design";
import { getBatchInvoices, ocrFor, type Invoice } from "@/lib/invoices";
import type {
  AppSettings,
  Batch,
  BatchFailureItem,
  BatchSource,
  BatchState,
  FailureCategory,
  InvoiceType,
  Organization,
  PromoAttachment,
  Resolution,
  Role,
  ResolutionCheck,
} from "@/lib/types";

const BATCHES_KEY = "egflow.batches";
const ORGS_KEY = "egflow.organizations";
const ORG_CONTEXT_KEY = "egflow.current-org";
const ROLE_KEY = "egflow.role";
const SETTINGS_KEY = "egflow.settings";
const EVENT = "egflow-store-updated";

const SEED_ORGS: Organization[] = [
  {
    id: "org-airtel",
    name: "Vattenfall",
    active: true,
    mainDispatch: "email",
    createdAt: "2026-01-12T09:00:00.000Z",
    features: { review: true, manualUpload: true, smtp: true },
  },
  {
    id: "org-helios",
    name: "Fortum",
    active: true,
    mainDispatch: "postal",
    createdAt: "2026-03-04T09:00:00.000Z",
    features: { review: false, manualUpload: true, smtp: true },
  },
  {
    id: "org-nordkraft",
    name: "Ørsted",
    active: false,
    mainDispatch: "sms",
    createdAt: "2026-05-20T09:00:00.000Z",
    features: { review: true, manualUpload: true, smtp: false },
  },
];

function pad(n: number, len = 4): string {
  return n.toString().padStart(len, "0");
}

function daysAgo(n: number, minutesOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setMinutes(d.getMinutes() - minutesOffset);
  return d.toISOString();
}

function buildHighVolumeFailureItems(): BatchFailureItem[] {
  return [
    {
      id: "fail-demo-1",
      level: "invoice",
      stage: "rendering",
      invoiceRef: "INV-12001",
      message: "Missing customer account number",
      category: "data",
    },
    {
      id: "fail-demo-2",
      level: "invoice",
      stage: "rendering",
      invoiceRef: "INV-12002",
      message: "PDF renderer timed out",
      category: "transient",
    },
    {
      id: "fail-demo-3",
      level: "invoice",
      stage: "rendering",
      invoiceRef: "INV-12003",
      message: "VAT ID format is invalid",
      category: "data",
    },
    {
      id: "fail-demo-4",
      level: "invoice",
      stage: "rendering",
      invoiceRef: "INV-12004",
      message: "Invoice total does not match line-item sum",
      category: "data",
    },
    {
      id: "fail-demo-5",
      level: "invoice",
      stage: "dispatching",
      invoiceRef: "INV-12005",
      message: "Dispatch service timed out while sending",
      category: "transient",
    },
    {
      id: "fail-demo-6",
      level: "invoice",
      stage: "dispatching",
      invoiceRef: "INV-12006",
      message: "Recipient mailbox rejected with 550 policy block",
      category: "delivery",
    },
    {
      id: "fail-demo-7",
      level: "invoice",
      stage: "dispatching",
      invoiceRef: "INV-12007",
      message: "Missing recipient email address",
      category: "delivery",
    },
    {
      id: "fail-demo-8",
      level: "invoice",
      stage: "rendering",
      invoiceRef: "INV-12008",
      message: "Unsupported UTF-8 byte sequence in description field",
      category: "data",
    },
    {
      id: "fail-demo-9",
      level: "invoice",
      stage: "rendering",
      invoiceRef: "INV-12009",
      message: "Due date is outside allowed posting window",
      category: "data",
    },
    {
      id: "fail-demo-10",
      level: "invoice",
      stage: "rendering",
      invoiceRef: "INV-12010",
      message: "Negative invoice total detected",
      category: "data",
    },
    {
      id: "fail-demo-11",
      level: "invoice",
      stage: "rendering",
      invoiceRef: "INV-12011",
      message: "Malformed tax breakdown node",
      category: "data",
    },
    {
      id: "fail-demo-12",
      level: "batch",
      stage: "rendering",
      message: "XML parser aborted at line 893 due to mismatched closing tag",
      category: "data",
    },
    {
      id: "fail-demo-13",
      level: "batch",
      stage: "rendering",
      message: "PDF renderer queue is temporarily unavailable",
      category: "transient",
    },
    {
      id: "fail-demo-14",
      level: "batch",
      stage: "dispatching",
      message: "SFTP host handshake failed during transport",
      category: "transient",
    },
    {
      id: "fail-demo-15",
      level: "invoice",
      stage: "dispatching",
      invoiceRef: "INV-12012",
      message: "Recipient address was flagged as inactive",
      category: "delivery",
    },
    {
      id: "fail-demo-16",
      level: "invoice",
      stage: "rendering",
      invoiceRef: "INV-12013",
      message: "Duplicate invoice number in current batch",
      category: "data",
    },
  ];
}

const HIGH_VOLUME_FAILED_BATCH: Batch = {
  id: "BATCH-9090",
  organizationId: "org-airtel",
  source: "zenith",
  invoiceCount: 128,
  state: "failed",
  reviewRequired: true,
  customerEmail: "finance@enterprise-customer.example",
  createdAt: daysAgo(0, 180),
  updatedAt: daysAgo(0, 30),
  failureReason:
    "Multiple invoice and transport failures detected in this XML batch",
  failedStage: "rendering",
  failureItems: buildHighVolumeFailureItems(),
};

const ADDITIONAL_FAILED_BATCHES: Batch[] = [
  // A later upload that re-sends three invoices that failed in BATCH-9090 (same OCR numbers).
  {
    id: "BATCH-9091",
    organizationId: "org-airtel",
    source: "manual",
    invoiceCount: 3,
    state: "completed",
    reviewRequired: true,
    customerEmail: "finance@enterprise-customer.example",
    createdAt: daysAgo(0, 20),
    updatedAt: daysAgo(0, 10),
    dispatchedAt: daysAgo(0, 10),
    reuploadOcr: [
      ocrFor("BATCH-9090", 0),
      ocrFor("BATCH-9090", 1),
      ocrFor("BATCH-9090", 2),
    ],
  },
  // A later upload whose invoices re-send three earlier failed invoices (same OCR numbers).
  {
    id: "BATCH-1035",
    organizationId: "org-airtel",
    source: "smtp",
    invoiceCount: 4,
    state: "completed",
    reviewRequired: true,
    customerEmail: "ap@northshore-energy.example",
    createdAt: daysAgo(0, 45),
    updatedAt: daysAgo(0, 20),
    reuploadOcr: [
      ocrFor("BATCH-1027", 0),
      ocrFor("BATCH-1027", 1),
      ocrFor("BATCH-1028", 0),
    ],
  },
  {
    id: "BATCH-1027",
    organizationId: "org-airtel",
    source: "manual",
    invoiceCount: 6,
    state: "failed",
    reviewRequired: true,
    customerEmail: "ap@northshore-energy.example",
    createdAt: daysAgo(3, 75),
    updatedAt: daysAgo(2, 20),
    failureReason: "Invoice validation failed for two records",
    failedStage: "rendering",
    failureItems: [
      {
        id: "fail-airtel-1027-1",
        level: "invoice",
        stage: "rendering",
        invoiceRef: "INV-41001",
        message: "Tax amount does not match the declared rate",
        category: "data",
      },
      {
        id: "fail-airtel-1027-2",
        level: "invoice",
        stage: "rendering",
        invoiceRef: "INV-41002",
        message: "Invoice date is outside the accepted period",
        category: "data",
      },
    ],
  },
  {
    id: "BATCH-1031",
    organizationId: "org-helios",
    source: "zenith",
    invoiceCount: 12,
    state: "failed",
    reviewRequired: true,
    customerEmail: "ar@vestfjord-energi.example",
    createdAt: daysAgo(0, 130),
    updatedAt: daysAgo(0, 55),
    failureReason: "Delivery failed for two invoices",
    failedStage: "dispatching",
    failureItems: [
      {
        id: "fail-airtel-1031-1",
        level: "invoice",
        stage: "dispatching",
        invoiceRef: "INV-45001",
        message: "Recipient mailbox is full",
        category: "delivery",
      },
      {
        id: "fail-airtel-1031-2",
        level: "invoice",
        stage: "dispatching",
        invoiceRef: "INV-45002",
        message: "Missing recipient email address",
        category: "delivery",
      },
    ],
  },
  {
    id: "BATCH-1030",
    organizationId: "org-helios",
    source: "smtp",
    invoiceCount: 5,
    state: "failed",
    reviewRequired: true,
    customerEmail: "billing@skagerrak-kraft.example",
    createdAt: daysAgo(0, 95),
    updatedAt: daysAgo(0, 40),
    failureReason: "Delivery failed for two invoices",
    failedStage: "dispatching",
    failureItems: [
      {
        id: "fail-airtel-1030-1",
        level: "invoice",
        stage: "dispatching",
        invoiceRef: "INV-44001",
        message: "Recipient mailbox does not exist",
        category: "delivery",
      },
      {
        id: "fail-airtel-1030-2",
        level: "invoice",
        stage: "dispatching",
        invoiceRef: "INV-44002",
        message: "Recipient domain rejected message with 550 policy block",
        category: "delivery",
      },
    ],
  },
  {
    id: "BATCH-1028",
    organizationId: "org-airtel",
    source: "smtp",
    invoiceCount: 12,
    state: "failed",
    reviewRequired: true,
    customerEmail: "finance@fjordline-power.example",
    createdAt: daysAgo(2, 160),
    updatedAt: daysAgo(1, 35),
    failureReason: "Delivery failed for one invoice",
    failedStage: "dispatching",
    failureItems: [
      {
        id: "fail-airtel-1028-1",
        level: "invoice",
        stage: "dispatching",
        invoiceRef: "INV-42001",
        message: "Recipient mailbox rejected the attachment",
        category: "delivery",
      },
    ],
  },
  {
    id: "BATCH-1029",
    organizationId: "org-airtel",
    source: "zenith",
    invoiceCount: 4,
    state: "failed",
    reviewRequired: true,
    customerEmail: "invoices@northgrid.example",
    createdAt: daysAgo(1, 230),
    updatedAt: daysAgo(1, 80),
    failureReason: "Rendering stopped after an invalid line item",
    failedStage: "rendering",
    failureItems: [
      {
        id: "fail-airtel-1029-1",
        level: "invoice",
        stage: "rendering",
        invoiceRef: "INV-43001",
        message: "Line item is missing a unit price",
        category: "data",
      },
    ],
  },
];

function buildSeedBatches(): Batch[] {
  const batches: Batch[] = [];
  let counter = 1000;
  const next = () => `BATCH-${pad(counter++)}`;

  const orgIds = SEED_ORGS.map((o) => o.id);
  const sources: BatchSource[] = ["manual", "zenith", "smtp"];
  const customers = [
    "billing@acmelogistics.dk",
    "ap@nordwind-shipping.com",
    "finance@brightgrid.eu",
    "accounts@vestergroup.dk",
    "invoices@polarfreight.no",
    "ap@sunridge-energy.com",
  ];

  // A representative spread of ordinary batches across orgs/sources/states.
  const states: BatchState[] = [
    "pending",
    "rendering",
    "review",
    "completed",
    "completed",
    "completed",
  ];
  orgIds.forEach((orgId, orgIdx) => {
    for (let i = 0; i < 8; i++) {
      const source = sources[(i + orgIdx) % sources.length];
      // Only manual uploads wait to be rendered; SFTP and zip batches render on arrival.
      const picked =
        source === "manual"
          ? states[i % states.length]
          : states[(i + 2) % states.length];
      const state: BatchState = source !== "manual" && picked === "pending" ? "review" : picked;
      const created = daysAgo(8 - i, i * 7);
      batches.push({
        id: next(),
        organizationId: orgId,
        source,
        invoiceCount: 1 + ((i * 3 + orgIdx) % 12),
        state,
        reviewRequired: SEED_ORGS[orgIdx].features.review,
        customerEmail: customers[(i + orgIdx) % customers.length],
        createdAt: created,
        updatedAt: created,
      });
    }
  });

  // A few failures with varied reasons and failed stages, unresolved.
  batches.push({
    id: next(),
    organizationId: "org-airtel",
    source: "zenith",
    invoiceCount: 3,
    state: "failed",
    reviewRequired: true,
    customerEmail: "billing@missing-email-example.dk",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(5, 30),
    failureReason: "Missing customer email address",
    failedStage: "dispatching",
    failureItems: [
      {
        id: "fail-airtel-1",
        level: "invoice",
        stage: "dispatching",
        invoiceRef: "INV-90017",
        message: "Missing customer email address",
        category: "delivery",
      },
      {
        id: "fail-airtel-2",
        level: "invoice",
        stage: "rendering",
        invoiceRef: "INV-90018",
        message: "Customer VAT ID format is invalid",
        category: "data",
      },
      {
        id: "fail-airtel-3",
        level: "batch",
        stage: "dispatching",
        message: "SMTP endpoint timed out after 3 retries",
        category: "transient",
      },
    ],
  });
  batches.push({
    id: next(),
    organizationId: "org-helios",
    source: "smtp",
    invoiceCount: 1,
    state: "failed",
    reviewRequired: false,
    customerEmail: "ap@unreachable-domain.example",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2, 10),
    failureReason:
      "Dispatch failed — recipient mail server rejected the message",
    failedStage: "dispatching",
    failureItems: [
      {
        id: "fail-helios-1",
        level: "invoice",
        stage: "dispatching",
        invoiceRef: "INV-32001",
        message: "Recipient mailbox does not exist",
        category: "delivery",
      },
      {
        id: "fail-helios-2",
        level: "invoice",
        stage: "dispatching",
        invoiceRef: "INV-32002",
        message: "Recipient domain rejected message with 550 policy block",
        category: "delivery",
      },
    ],
  });
  batches.push({
    id: next(),
    organizationId: "org-nordkraft",
    source: "manual",
    invoiceCount: 5,
    state: "failed",
    reviewRequired: true,
    customerEmail: "invoices@nordkraft-customer.dk",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1, 5),
    failureReason: "Rendering failed — malformed XML structure",
    failedStage: "rendering",
    failureItems: [
      {
        id: "fail-nordkraft-1",
        level: "batch",
        stage: "rendering",
        message: "Malformed XML near <invoiceHeader> at line 148",
        category: "data",
      },
      {
        id: "fail-nordkraft-2",
        level: "invoice",
        stage: "rendering",
        invoiceRef: "INV-88211",
        message: "Missing currency code",
        category: "data",
      },
      {
        id: "fail-nordkraft-3",
        level: "batch",
        stage: "rendering",
        message: "PDF renderer service unavailable",
        category: "transient",
      },
    ],
  });

  batches.push(...ADDITIONAL_FAILED_BATCHES, HIGH_VOLUME_FAILED_BATCH);

  return batches;
}

function writeJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(EVENT));
}

function ensureSeeded() {
  if (typeof window === "undefined") return;
  if (!window.localStorage.getItem(ORGS_KEY)) {
    window.localStorage.setItem(ORGS_KEY, JSON.stringify(SEED_ORGS));
  } else {
    // Rename organizations saved under the earlier placeholder names.
    const legacy: Record<string, string> = {
      "Airtel Nordic": "Vattenfall",
      "Helios Energy": "Fortum",
      "Nordkraft Utilities": "Ørsted",
    };
    try {
      const stored = JSON.parse(
        window.localStorage.getItem(ORGS_KEY) as string,
      ) as Organization[];
      if (stored.some((o) => o.name in legacy)) {
        window.localStorage.setItem(
          ORGS_KEY,
          JSON.stringify(
            stored.map((o) => ({ ...o, name: legacy[o.name] ?? o.name })),
          ),
        );
      }
    } catch {
      // Leave unreadable data for the existing handling.
    }
  }
  const rawBatches = window.localStorage.getItem(BATCHES_KEY);
  if (!rawBatches) {
    window.localStorage.setItem(
      BATCHES_KEY,
      JSON.stringify(buildSeedBatches()),
    );
    return;
  }

  try {
    const all = JSON.parse(rawBatches) as Batch[];
    const parsed = all.filter(
      // Rejection was removed; drop batches saved in that state.
      (batch) => (batch.state as string) !== "rejected",
    );
    const seedBatches = [
      ...ADDITIONAL_FAILED_BATCHES,
      HIGH_VOLUME_FAILED_BATCH,
    ];
    // Keep existing demo data but upgrade the seeded replacement batch so its
    // candidate is visible without asking the user to clear localStorage.
    const upgraded = parsed.map((batch) =>
      batch.id === "BATCH-1035"
        ? { ...batch, source: "smtp" as const, state: "completed" as const, dispatchedAt: batch.dispatchedAt ?? new Date().toISOString() }
        : batch,
    );
    const missingBatches = seedBatches.filter(
      (seedBatch) => !upgraded.some((batch) => batch.id === seedBatch.id),
    );
    if (missingBatches.length > 0 || parsed.length !== all.length || upgraded.some((batch, index) => batch !== parsed[index])) {
      window.localStorage.setItem(
        BATCHES_KEY,
        JSON.stringify([...missingBatches, ...upgraded]),
      );
    }
  } catch {
    window.localStorage.setItem(
      BATCHES_KEY,
      JSON.stringify(buildSeedBatches()),
    );
  }
}

// --- subscriptions -------------------------------------------------------

let cachedRaw: string | null = null;
let cachedBatches: Batch[] = [];

export function subscribeStore(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * SFTP and zip batches render automatically on arrival, so they never sit waiting for "Start render".
 * Batches saved before that rule are shown at the stage they would have reached: review, or dispatched
 * when the organization skips review.
 */
function withAutoRender(batch: Batch): Batch {
  if (batch.source === "manual" || batch.state !== "pending") return batch;
  return batch.reviewRequired
    ? { ...batch, state: "review" }
    : { ...batch, state: "completed", dispatchedAt: batch.dispatchedAt ?? batch.createdAt };
}

export function getBatchesSnapshot(): Batch[] {
  if (typeof window === "undefined") return cachedBatches;
  ensureSeeded();
  const raw = window.localStorage.getItem(BATCHES_KEY);
  if (raw === cachedRaw) return cachedBatches;
  cachedRaw = raw;
  cachedBatches = raw
    ? (JSON.parse(raw) as Batch[]).map((b) => withAutoRender(b.source in SOURCE_LABELS ? b : { ...b, source: "smtp" as const }))
    : [];
  return cachedBatches;
}

const SERVER_EMPTY_BATCHES: Batch[] = [];
export function getServerBatchesSnapshot(): Batch[] {
  return SERVER_EMPTY_BATCHES;
}

function saveBatches(batches: Batch[]) {
  writeJSON(BATCHES_KEY, batches);
  autoResolveFailedBatches();
}

// --- promotional attachments (shared by every organization) -----------------

const PROMO_KEY = "egflow.promo-attachments";
const EMPTY_PROMO: PromoAttachment[] = [];
let cachedPromoRaw: string | null = null;
let cachedPromo: PromoAttachment[] = EMPTY_PROMO;

export function getPromoAttachments(): PromoAttachment[] {
  if (typeof window === "undefined") return EMPTY_PROMO;
  const raw = window.localStorage.getItem(PROMO_KEY);
  if (raw === cachedPromoRaw) return cachedPromo;
  cachedPromoRaw = raw;
  cachedPromo = raw ? JSON.parse(raw) : EMPTY_PROMO;
  return cachedPromo;
}

export function savePromoAttachments(list: PromoAttachment[]): boolean {
  try {
    writeJSON(PROMO_KEY, list);
    return true;
  } catch {
    return false;
  }
}

// --- organizations ---------------------------------------------------------

let cachedOrgsRaw: string | null = null;
let cachedOrgs: Organization[] = SEED_ORGS;

export function getOrganizations(): Organization[] {
  ensureSeeded();
  if (typeof window === "undefined") return cachedOrgs;
  const raw = window.localStorage.getItem(ORGS_KEY);
  if (raw === cachedOrgsRaw) return cachedOrgs;
  cachedOrgsRaw = raw;
  cachedOrgs = raw
    ? (JSON.parse(raw) as Organization[]).map((o) => {
        const seed = SEED_ORGS.find((s) => s.id === o.id);
        return seed
          ? { ...o, active: o.active ?? seed.active, mainDispatch: o.mainDispatch ?? seed.mainDispatch, createdAt: o.createdAt ?? seed.createdAt }
          : o;
      })
    : SEED_ORGS;
  return cachedOrgs;
}

export function getOrganization(id: string): Organization | undefined {
  return getOrganizations().find((o) => o.id === id);
}

export function createOrganization(name: string): Organization {
  const orgs = getOrganizations();
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "org";
  let id = `org-${slug}`;
  for (let n = 2; orgs.some((o) => o.id === id); n++) id = `org-${slug}-${n}`;
  const org: Organization = {
    id,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    features: { review: true, manualUpload: true, smtp: false },
  };
  writeJSON(ORGS_KEY, [...orgs, org]);
  return org;
}

export function updateOrganizationFeatures(
  id: string,
  features: Partial<Organization["features"]>,
) {
  const orgs = getOrganizations().map((o) =>
    o.id === id ? { ...o, features: { ...o.features, ...features } } : o,
  );
  writeJSON(ORGS_KEY, orgs);
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: "en",
  company: {
    name: "",
    vendor: "",
    registrationNumber: "",
    portalAddress: "",
    street: "",
    city: "",
    postalCode: "",
    country: "",
    retentionYears: 7,
  },
  providers: { email: "sendgrid", print: "none", sms: "none" },
  pdf: {
    consumption: { active: true, design: defaultDesign() },
    production: { active: true, design: defaultDesign() },
    group: { active: true, design: defaultDesign() },
  },
  email: {
    fromEmail: "",
    fromName: "",
    subject: "Din faktura {{invoice_number}} fra {{vendor}}",
    design: defaultDesign("center"),
    attachments: {
      enabled: true,
      promotional: true,
      invoicePdf: true,
      originalXml: false,
      additional: false,
      files: [],
    },
  },
  monitoring: { track: true, opened: true, read: true, clicked: false },
};

let cachedSettingsRaw: string | null = null;
let cachedSettings: Record<string, AppSettings> = {};

function mergePdf(type: InvoiceType, stored: Partial<AppSettings>) {
  const base = DEFAULT_SETTINGS.pdf[type];
  const saved = stored.pdf?.[type];
  return { ...base, ...saved, design: { ...base.design, ...saved?.design } };
}

function withDefaults(stored: Partial<AppSettings>): AppSettings {
  return {
    language: stored.language ?? DEFAULT_SETTINGS.language,
    company: { ...DEFAULT_SETTINGS.company, ...stored.company },
    providers: { ...DEFAULT_SETTINGS.providers, ...stored.providers },
    pdf: {
      consumption: mergePdf("consumption", stored),
      production: mergePdf("production", stored),
      group: mergePdf("group", stored),
    },
    email: {
      ...DEFAULT_SETTINGS.email,
      ...stored.email,
      design: { ...DEFAULT_SETTINGS.email.design, ...stored.email?.design },
      attachments: {
        ...DEFAULT_SETTINGS.email.attachments,
        ...stored.email?.attachments,
      },
    },
    monitoring: { ...DEFAULT_SETTINGS.monitoring, ...stored.monitoring },
  };
}

export function getSettings(organizationId: string): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (raw !== cachedSettingsRaw) {
    cachedSettingsRaw = raw;
    const parsed: Record<string, Partial<AppSettings>> = raw
      ? JSON.parse(raw)
      : {};
    cachedSettings = Object.fromEntries(
      Object.entries(parsed).map(([id, stored]) => [id, withDefaults(stored)]),
    );
  }
  return cachedSettings[organizationId] ?? DEFAULT_SETTINGS;
}

/** Returns false when the browser has no room left, which uploaded images can cause. */
export function saveSettings(
  organizationId: string,
  settings: AppSettings,
): boolean {
  const raw =
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(SETTINGS_KEY);
  const all = raw ? JSON.parse(raw) : {};
  try {
    writeJSON(SETTINGS_KEY, { ...all, [organizationId]: settings });
    return true;
  } catch {
    return false;
  }
}

export function getCurrentOrgId(): string {
  ensureSeeded();
  if (typeof window === "undefined") return SEED_ORGS[0].id;
  return window.localStorage.getItem(ORG_CONTEXT_KEY) ?? SEED_ORGS[0].id;
}

export function setCurrentOrgId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ORG_CONTEXT_KEY, id);
  window.dispatchEvent(new Event(EVENT));
}

export function getRole(): Role {
  if (typeof window === "undefined") return "org_user";
  return (window.localStorage.getItem(ROLE_KEY) as Role) ?? "org_user";
}

export function setRole(role: Role) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ROLE_KEY, role);
  window.dispatchEvent(new Event(EVENT));
}

// --- batches ---------------------------------------------------------------

export function getBatches(organizationId: string): Batch[] {
  return getBatchesSnapshot()
    .filter((b) => b.organizationId === organizationId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getBatch(id: string): Batch | undefined {
  return getBatchesSnapshot().find((b) => b.id === id);
}

function updateBatch(id: string, patch: Partial<Batch>) {
  const batches = getBatchesSnapshot().map((b) =>
    b.id === id ? { ...b, ...patch, updatedAt: new Date().toISOString() } : b,
  );
  saveBatches(batches);
}

function nextBatchId(): string {
  const batches = getBatchesSnapshot();
  const max = batches.reduce((acc, b) => {
    const n = parseInt(b.id.replace("BATCH-", ""), 10);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 1000);
  return `BATCH-${pad(max + 1)}`;
}

export function createManualBatch(input: {
  organizationId: string;
  invoiceCount: number;
  customerEmail: string;
}): Batch {
  const now = new Date().toISOString();
  const org = getOrganization(input.organizationId);
  const batch: Batch = {
    id: nextBatchId(),
    organizationId: input.organizationId,
    source: "manual",
    invoiceCount: input.invoiceCount,
    state: "pending",
    reviewRequired: org?.features.review ?? true,
    customerEmail: input.customerEmail,
    createdAt: now,
    updatedAt: now,
  };
  saveBatches([batch, ...getBatchesSnapshot()]);
  return batch;
}

export function startRendering(id: string) {
  const total = 4000;
  const steps = 10;
  updateBatch(id, { state: "rendering", progress: 0 });
  for (let i = 1; i < steps; i++) {
    setTimeout(() => {
      if (getBatch(id)?.state === "rendering") {
        updateBatch(id, { progress: Math.round((i / steps) * 100) });
      }
    }, (total / steps) * i);
  }
  setTimeout(() => {
    const batch = getBatch(id);
    if (!batch) return;
    updateBatch(id, {
      state: batch.reviewRequired ? "review" : "dispatching",
      progress: 100,
      ...(batch.reviewRequired ? {} : { dispatchedAt: new Date().toISOString() }),
    });
    if (!batch.reviewRequired) {
      setTimeout(() => updateBatch(id, { state: "completed" }), 1200);
    }
  }, total);
}

export function approveBatch(id: string) {
  updateBatch(id, { state: "approved" });
}

export function approveRemaining(id: string) {
  updateBatch(id, { remainingApproved: true });
}

export function dispatchBatch(id: string, note?: string) {
  // Successful invoices may be dispatched while failed invoices remain actionable.
  const wasFailed = ["failed", "partial"].includes(getBatch(id)?.state ?? "");
  updateBatch(id, {
    state: "dispatching",
    dispatchNote: note,
    dispatchedAt: new Date().toISOString(),
    ...(wasFailed ? { partiallyDispatched: true } : {}),
  });
  setTimeout(() => updateBatch(id, { state: wasFailed ? "partial" : "completed" }), 1200);
}

export function getFailureItems(batch: Batch): BatchFailureItem[] {
  // Batches saved before failure types existed have no category; treat them as invoice data problems.
  if (batch.failureItems?.length) {
    return batch.failureItems.map((item) => (item.category ? item : { ...item, category: "data" }));
  }
  if (!batch.failureReason) return [];
  return [
    {
      id: `${batch.id}-legacy-failure`,
      level: "batch",
      stage:
        batch.failedStage === "rendering" ||
        batch.failedStage === "approved" ||
        batch.failedStage === "dispatching"
          ? batch.failedStage
          : "rendering",
      message: batch.failureReason,
      category: "data",
    },
  ];
}

/** The failure recorded for one invoice, or undefined when the whole batch failed. */
export function getInvoiceFailure(batch: Batch, invoiceNumber: string): BatchFailureItem | undefined {
  const index = getBatchInvoices(batch).findIndex((invoice) => invoice.number === invoiceNumber);
  return (batch.failureItems ?? []).filter((item) => item.level === "invoice")[index];
}

/**
 * Closes a failed batch once every failed invoice is handled: retried, confirmed against a replacement, or dismissed.
 * A batch that was never partially dispatched and was fixed purely by retries counts as dispatched; any other
 * recovery ends as resolved, so the same recovery never finishes with two different statuses.
 */
function settleBatch(batchId: string) {
  const batch = getBatchesSnapshot().find((b) => b.id === batchId);
  if (!batch || (batch.state !== "failed" && batch.state !== "partial")) return;
  const resolutions = getResolutions().filter((r) => r.failedBatchId === batchId);
  const resolved = new Set(resolutions.map((r) => r.failedInvoice));
  const dismissed = batch.dismissedInvoices ?? {};
  const stillFailed = getBatchInvoices(batch).some((invoice) => invoice.status === "failed" && !resolved.has(invoice.number) && !(invoice.number in dismissed));
  if (stillFailed) return;
  const now = new Date().toISOString();
  const retriedOnly = !batch.partiallyDispatched && resolutions.length === 0 && Object.keys(dismissed).length === 0;
  updateBatch(batchId, retriedOnly ? { state: "completed", dispatchedAt: now } : { state: "resolved", resolvedAt: now });
}

/** Temporary failures need no fix: retrying the stage they failed at is enough. */
export function retryInvoice(batchId: string, invoiceNumber: string) {
  const batch = getBatchesSnapshot().find((b) => b.id === batchId);
  const item = batch && getInvoiceFailure(batch, invoiceNumber);
  if (!batch || !item || item.category !== "transient" || item.retried) return;
  const failureItems = (batch.failureItems ?? []).map((f) => (f.id === item.id ? { ...f, retried: true } : f));
  updateBatch(batchId, { failureItems });
  settleBatch(batchId);
}

/** Retries every temporary failure that has not been retried yet; returns how many were retried. */
export function retryAllTransient(batchId: string): number {
  const batch = getBatchesSnapshot().find((b) => b.id === batchId);
  if (!batch) return 0;
  const pending = (batch.failureItems ?? []).filter((f) => f.level === "invoice" && f.category === "transient" && !f.retried);
  if (pending.length === 0) return 0;
  const ids = new Set(pending.map((f) => f.id));
  updateBatch(batchId, { failureItems: (batch.failureItems ?? []).map((f) => (ids.has(f.id) ? { ...f, retried: true } : f)) });
  settleBatch(batchId);
  return pending.length;
}

/** Gives up on a failed invoice that cannot be fixed. It counts as handled so the batch can finish. */
export function dismissInvoice(batchId: string, invoiceNumber: string, reason: string) {
  const batch = getBatchesSnapshot().find((b) => b.id === batchId);
  if (!batch) return;
  updateBatch(batchId, { dismissedInvoices: { ...(batch.dismissedInvoices ?? {}), [invoiceNumber]: reason.trim() || "Dismissed" } });
  settleBatch(batchId);
}

// --- resolutions: matching fixed invoices to failed ones by OCR number ----------

const RESOLUTIONS_KEY = "egflow.resolutions";
const EMPTY_RESOLUTIONS: Resolution[] = [];
let cachedResolutionsRaw: string | null = null;
let cachedResolutions: Resolution[] = EMPTY_RESOLUTIONS;

export function getResolutions(): Resolution[] {
  if (typeof window === "undefined") return EMPTY_RESOLUTIONS;
  const raw = window.localStorage.getItem(RESOLUTIONS_KEY);
  if (raw === cachedResolutionsRaw) return cachedResolutions;
  cachedResolutionsRaw = raw;
  cachedResolutions = raw ? JSON.parse(raw) : EMPTY_RESOLUTIONS;
  return cachedResolutions;
}

export type ResolutionCandidate = {
  ocr: string;
  failed: Invoice;
  replacement: Invoice;
  replacementBatchId: string;
  replacementSource: BatchSource;
  checks: ResolutionCheck[];
  /** OCR and organization are required; other differences are explicitly surfaced for review. */
  safeToConfirm: boolean;
};

function normalized(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function comparison(
  failedBatch: Batch,
  replacementBatch: Batch,
  failed: Invoice,
  replacement: Invoice,
): ResolutionCheck[] {
  const values: Array<[ResolutionCheck["field"], string, string, boolean]> = [
    ["OCR number", failed.ocr, replacement.ocr, normalized(failed.ocr) === normalized(replacement.ocr)],
    ["Organization", failedBatch.organizationId, replacementBatch.organizationId, failedBatch.organizationId === replacementBatch.organizationId],
    ["Customer", failed.customer, replacement.customer, normalized(failed.customer) === normalized(replacement.customer)],
    ["Recipient", failed.recipient, replacement.recipient, normalized(failed.recipient) === normalized(replacement.recipient)],
    ["Gross amount", `${failed.grossAmount}`, `${replacement.grossAmount}`, failed.grossAmount === replacement.grossAmount],
    ["Currency", failed.currency, replacement.currency, failed.currency === replacement.currency],
  ];
  return values.map(([field, expected, actual, matches], index) => ({
    field, expected, actual, matches, required: index < 2,
  }));
}

/**
 * Finds replacement candidates from every configured ingestion channel. This is
 * deliberately source-agnostic: incoming FTP/SFTP, watched-folder and connector
 * batches enter the same comparison path and are matched by OCR number and resolved automatically.
 */
export function getResolutionCandidates(failedBatch: Batch): ResolutionCandidate[] {
  if (failedBatch.state !== "failed" && failedBatch.state !== "partial") return [];
  const resolved = new Set(
    getResolutions()
      .filter((r) => r.failedBatchId === failedBatch.id)
      .map((r) => r.failedInvoice),
  );
  const open = getBatchInvoices(failedBatch).filter(
    (invoice) => invoice.status === "failed" && !resolved.has(invoice.number),
  );
  const candidates: ResolutionCandidate[] = [];
  for (const batch of getBatchesSnapshot()) {
    if (batch.organizationId !== failedBatch.organizationId || batch.id === failedBatch.id) continue;
    // A replacement must have been dispatched before it can close a failure.
    if (batch.state !== "completed") continue;
    for (const replacement of getBatchInvoices(batch)) {
      if (replacement.status !== "rendered") continue;
      const failed = open.find((invoice) => normalized(invoice.ocr) === normalized(replacement.ocr));
      if (!failed) continue;
      const checks = comparison(failedBatch, batch, failed, replacement);
      candidates.push({
        ocr: failed.ocr,
        failed,
        replacement,
        replacementBatchId: batch.id,
        replacementSource: batch.source,
        checks,
        safeToConfirm: checks.filter((check) => check.required).every((check) => check.matches),
      });
    }
  }
  return candidates.sort((a, b) => {
    const aScore = a.checks.filter((check) => check.matches).length;
    const bScore = b.checks.filter((check) => check.matches).length;
    return bScore - aScore || a.replacementBatchId.localeCompare(b.replacementBatchId);
  });
}

/** Records the matches as resolutions and clears the batch from Failed once every failed invoice is resolved. */
export function confirmResolutions(
  failedBatch: Batch,
  candidates: ResolutionCandidate[],
  confirmedBy: string,
) {
  if (candidates.length === 0) return;
  const now = new Date().toISOString();
  const alreadyResolved = new Set(getResolutions().filter((r) => r.failedBatchId === failedBatch.id).map((r) => r.failedInvoice));
  const onePerInvoice = new Set<string>();
  const confirmed = candidates.filter((candidate) => {
    if (!candidate.safeToConfirm || alreadyResolved.has(candidate.failed.number) || onePerInvoice.has(candidate.failed.number)) return false;
    onePerInvoice.add(candidate.failed.number);
    return true;
  });
  if (confirmed.length === 0) return;
  const records: Resolution[] = confirmed.map((c) => ({
    id: `res-${failedBatch.id}-${c.failed.number}`,
    organizationId: failedBatch.organizationId,
    ocr: c.ocr,
    failedBatchId: failedBatch.id,
    failedInvoice: c.failed.number,
    failureReason: c.failed.reason ?? "Failed",
    replacementBatchId: c.replacementBatchId,
    replacementInvoice: c.replacement.number,
    replacementSource: c.replacementSource,
    checks: c.checks,
    confirmedBy,
    confirmedAt: now,
  }));
  const all = [...getResolutions(), ...records];
  writeJSON(RESOLUTIONS_KEY, all);

  settleBatch(failedBatch.id);
}

export const AUTO_RESOLVER = "Automatic match";
let autoResolving = false;

/**
 * Resolves failed invoices on its own: once a replacement batch with the same OCR number has been dispatched,
 * the failed batch picks it up and records the match. Runs after every batch change.
 */
function autoResolveFailedBatches() {
  if (autoResolving || typeof window === "undefined") return;
  autoResolving = true;
  try {
    for (const batch of getBatchesSnapshot()) {
      const candidates = getResolutionCandidates(batch).filter((candidate) => candidate.safeToConfirm);
      if (candidates.length > 0) confirmResolutions(batch, candidates, AUTO_RESOLVER);
    }
  } finally {
    autoResolving = false;
  }
}

export function deleteBatch(id: string) {
  const remaining = getBatchesSnapshot().filter((b) => b.id !== id);
  saveBatches(remaining);
}

/** Restores every batch to its seeded demo state and clears confirmed resolutions. */
export function resetBatches() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(BATCHES_KEY);
  window.localStorage.removeItem(RESOLUTIONS_KEY);
  window.dispatchEvent(new Event(EVENT));
}

export const BATCH_STATE_LABELS: Record<BatchState, string> = {
  pending: "Uploaded",
  rendering: "Rendering",
  review: "Review pending",
  approved: "Approved",
  dispatching: "Dispatching",
  completed: "Dispatched",
  partial: "Partially dispatched",
  failed: "Failed",
  resolved: "Resolved & dispatched",
};

export const FAILURE_CATEGORY_LABELS: Record<FailureCategory, { label: string; hint: string }> = {
  transient: { label: "Temporary", hint: "A system or network problem. Retry later." },
  delivery: { label: "Delivery", hint: "The recipient could not be reached. Check the address or channel." },
  data: { label: "Invoice data", hint: "The invoice is invalid. Send a corrected invoice with the same OCR number." },
};

export const SOURCE_LABELS: Record<BatchSource, string> = {
  manual: "Uploaded",
  zenith: "Zip File",
  smtp: "SFTP",
};
