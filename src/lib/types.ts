/** How the batch entered EG Flow. All sources use the same recovery matcher. */
export type BatchSource =
  | "manual"
  | "zenith"
  | "smtp";

export type BatchState =
  | "pending"
  | "rendering"
  | "review"
  | "approved"
  | "dispatching"
  | "completed"
  /** Some invoices dispatched, while one or more still require a fix. */
  | "partial"
  | "failed"
  | "resolved";

export type FailureLevel = "batch" | "invoice";

/** What kind of fix a failure needs: a retry, a delivery change, or a corrected invoice. */
export type FailureCategory = "transient" | "delivery" | "data";

export type BatchFailureItem = {
  id: string;
  level: FailureLevel;
  stage: Exclude<BatchState, "pending" | "review" | "completed" | "partial" | "failed" | "resolved">;
  message: string;
  category: FailureCategory;
  invoiceRef?: string;
  /** Set when a temporary failure was retried (re-render or re-dispatch) and succeeded. */
  retried?: boolean;
};

export type Role = "org_user" | "super_admin";

export type OrganizationFeatures = {
  review: boolean;
  manualUpload: boolean;
  smtp: boolean;
};

export type Organization = {
  id: string;
  name: string;
  /** Defaults to active when unset. */
  active?: boolean;
  /** Defaults to email when unset. */
  mainDispatch?: "email" | "postal" | "sms";
  /** ISO date the organization was added. */
  createdAt?: string;
  features: OrganizationFeatures;
};

export type Batch = {
  id: string;
  organizationId: string;
  /** 0–100 while rendering; unset when unknown. */
  progress?: number;
  source: BatchSource;
  invoiceCount: number;
  state: BatchState;
  reviewRequired: boolean;
  customerEmail: string;
  createdAt: string;
  updatedAt: string;
  failureReason?: string;
  failedStage?: Exclude<
    BatchState,
    "pending" | "review" | "completed" | "partial" | "failed" | "resolved"
  >;
  failureItems?: BatchFailureItem[];
  /** Set once the invoices that rendered fine in a failed batch have been approved for dispatch. */
  remainingApproved?: boolean;
  dispatchNote?: string;
  /** Set when only the rendered invoices of a failed batch were sent; the batch stays failed. */
  partiallyDispatched?: boolean;
  /** ISO time the dispatch started; completed batches without it fall back to updatedAt. */
  dispatchedAt?: string;
  /** Failed invoices the user gave up on, by invoice number, with the reason. They count as handled. */
  dismissedInvoices?: Record<string, string>;
  /** ISO time every failed invoice was matched to a fix and confirmed. */
  resolvedAt?: string;
  /** OCR numbers carried by the first invoices of this batch, when they re-send earlier failed invoices. */
  reuploadOcr?: string[];
  /**
   * Extracted replacement fields in this prototype. In production these belong
   * to immutable ingestion/OCR records, not on the batch itself.
   */
  reuploadFields?: Record<
    string,
    { customer?: string; recipient?: string; grossAmount?: number; currency?: string }
  >;
};

/** Permanent record that a failed invoice was fixed by a later invoice with the same OCR number. */
export type Resolution = {
  id: string;
  organizationId: string;
  ocr: string;
  failedBatchId: string;
  failedInvoice: string;
  failureReason: string;
  replacementBatchId: string;
  replacementInvoice: string;
  replacementSource?: BatchSource;
  /** What was compared at manual confirmation time, including discrepancies. */
  checks?: ResolutionCheck[];
  confirmedBy: string;
  confirmedAt: string;
};

export type ResolutionCheck = {
  field: "OCR number" | "Organization" | "Customer" | "Recipient" | "Gross amount" | "Currency";
  expected: string;
  actual: string;
  matches: boolean;
  required: boolean;
};

export type EmailProvider = "sendgrid" | "ses" | "smtp";
export type PrintProvider = "none" | "postnord" | "doc2mail";
export type SmsProvider = "none" | "twilio" | "gatewayapi";

export type InvoiceType = "consumption" | "production" | "group";
export type Alignment = "left" | "center" | "right";
export type ImageSize = "small" | "medium" | "large";
export type StoredImage = {
  name: string;
  dataUrl: string;
  size?: number;
  width?: number;
  height?: number;
};
export type TemplateStyle = "standard" | "modern" | "minimal";
export type StoredTemplate = { name: string; content: string; uploadedAt?: string };

export type ImageSlot = {
  enabled: boolean;
  image?: StoredImage;
  alignment: Alignment;
  size: ImageSize;
};

export type CustomAsset = { id: string; tag: string; image?: StoredImage };

export type DesignSettings = {
  mode: "standard" | "custom";
  style: TemplateStyle;
  primaryColor: string;
  accentColor: string;
  header: ImageSlot;
  footer: ImageSlot;
  template: { html?: StoredTemplate; css?: StoredTemplate };
  assets: CustomAsset[];
};

export type PdfTypeSettings = { active: boolean; design: DesignSettings };

export type PromoAttachment = {
  id: string;
  name: string;
  size: number;
  lastModified: number;
};

export type EmailAttachments = {
  enabled: boolean;
  promotional: boolean;
  invoicePdf: boolean;
  originalXml: boolean;
  additional: boolean;
  files: { id: string; name: string; size?: number; lastModified?: number }[];
};

export type EmailSettings = {
  fromEmail: string;
  fromName: string;
  subject: string;
  design: DesignSettings;
  attachments: EmailAttachments;
};

export type Language = "en" | "da";

export type AppSettings = {
  language: Language;
  company: {
    name: string;
    vendor: string;
    registrationNumber: string;
    portalAddress: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    retentionYears: number;
  };
  providers: {
    email: EmailProvider;
    print: PrintProvider;
    sms: SmsProvider;
  };
  pdf: Record<InvoiceType, PdfTypeSettings>;
  email: EmailSettings;
  monitoring: {
    track: boolean;
    opened: boolean;
    read: boolean;
    clicked: boolean;
  };
};
