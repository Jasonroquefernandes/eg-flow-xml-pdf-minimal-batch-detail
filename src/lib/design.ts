import type {
  Alignment,
  DesignSettings,
  ImageSize,
  TemplateStyle,
} from "@/lib/types";

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_ACCEPT =
  ".png,.svg,.jpg,.jpeg,image/png,image/svg+xml,image/jpeg";
export const TEMPLATE_ACCEPT_HTML = ".html,.htm,text/html";
export const TEMPLATE_ACCEPT_CSS = ".css,text/css";

export const SIZE_LABELS: Record<ImageSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

export const ALIGNMENT_LABELS: Record<Alignment, string> = {
  left: "Left",
  center: "Center",
  right: "Right",
};

export const DEFAULT_PRIMARY = "#198B5E";
export const DEFAULT_ACCENT = "#BEEBD9";
export const TEMPLATE_LABELS: Record<TemplateStyle, string> = {
  standard: "Standard",
  modern: "Modern",
  minimal: "Minimal",
};

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export type DesignIssue = { field: string; message: string };

export function defaultDesign(
  headerAlignment: Alignment = "left",
): DesignSettings {
  return {
    mode: "standard",
    style: "standard",
    primaryColor: DEFAULT_PRIMARY,
    accentColor: DEFAULT_ACCENT,
    header: { enabled: true, alignment: headerAlignment, size: "medium" },
    footer: { enabled: false, alignment: "center", size: "small" },
    template: {},
    assets: [],
  };
}

export function isAllowedImage(file: File): boolean {
  return (
    /\.(png|svg|jpe?g)$/i.test(file.name) ||
    /^image\/(png|svg\+xml|jpeg)$/.test(file.type)
  );
}

/** An image tag is a placeholder used as an img src or a CSS url(). Other {{fields}} fill in automatically. */
export function detectImageTags(
  template: DesignSettings["template"],
): string[] {
  const tags = new Set<string>();
  const html = template.html?.content ?? "";
  const css = template.css?.content ?? "";
  const imgSrc =
    /<img\b[^>]*\bsrc\s*=\s*["']\s*\{\{\s*([\w.-]+)\s*\}\}\s*["']/gi;
  const cssUrl = /url\(\s*["']?\s*\{\{\s*([\w.-]+)\s*\}\}\s*["']?\s*\)/gi;
  for (const match of html.matchAll(imgSrc)) tags.add(match[1]);
  for (const match of html.matchAll(cssUrl)) tags.add(match[1]);
  for (const match of css.matchAll(cssUrl)) tags.add(match[1]);
  return [...tags];
}

export function validateDesign(
  design: DesignSettings,
  prefix: string,
): DesignIssue[] {
  const issues: DesignIssue[] = [];
  if (design.mode === "standard") {
    if (!isHexColor(design.primaryColor)) {
      issues.push({
        field: `${prefix}-primary-color`,
        message: "Enter a hex colour, like #198B5E.",
      });
    }
    if (!isHexColor(design.accentColor)) {
      issues.push({
        field: `${prefix}-accent-color`,
        message: "Enter a hex colour, like #BEEBD9.",
      });
    }
    return issues;
  }

  return issues;
}

const SAMPLE_VALUES: Record<string, string> = {
  invoice_number: "INV-10001",
  vendor: "Your company",
  customer: "Nordic Energy AB",
  customer_name: "Nordic Energy AB",
  date: "1 Oct 2026",
  invoice_date: "1 Oct 2026",
  due_date: "31 Oct 2026",
  total: "1 250,00 NOK",
  amount: "1 250,00 NOK",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Token values are read from the page so the preview document, which cannot inherit them, still follows the theme. */
function readToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

export function buildCustomPreviewHtml(
  design: DesignSettings,
  vendor: string,
): string | null {
  const html = design.template.html?.content;
  if (!html) return null;

  const warningSurface = readToken("--bs-surface-warning", "transparent");
  const warningText = readToken("--bs-text-warning", "inherit");
  const warningBorder = readToken("--bs-border-warning", "currentColor");
  const font = readToken("--bs-font-family-body", "sans-serif");
  const imageTags = new Set(detectImageTags(design.template));
  const imageFor = (tag: string) =>
    design.assets.find((a) => a.tag === tag)?.image?.dataUrl;

  const placeholder = (tag: string) =>
    `<span class="needs-image">Needs image: ${escapeHtml(tag)}</span>`;

  const fillImages = (source: string) =>
    source
      .replace(
        /<img\b[^>]*\bsrc\s*=\s*["']\s*\{\{\s*([\w.-]+)\s*\}\}\s*["'][^>]*>/gi,
        (full, tag: string) => {
          const url = imageFor(tag);
          return url
            ? full.replace(/\{\{\s*[\w.-]+\s*\}\}/, url)
            : placeholder(tag);
        },
      )
      .replace(
        /url\(\s*["']?\s*\{\{\s*([\w.-]+)\s*\}\}\s*["']?\s*\)/gi,
        (_full, tag: string) => {
          const url = imageFor(tag);
          return url
            ? `url("${url}")`
            : `linear-gradient(${warningSurface}, ${warningSurface})`;
        },
      );

  const fillFields = (source: string) =>
    source.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (full, key: string) => {
      if (imageTags.has(key)) return full;
      if (key === "vendor") return escapeHtml(vendor || SAMPLE_VALUES.vendor);
      return key in SAMPLE_VALUES ? escapeHtml(SAMPLE_VALUES[key]) : full;
    });

  const css = fillImages(design.template.css?.content ?? "");
  const body = fillFields(fillImages(html));
  const style = `<style>body{font-family:${font};}.needs-image{display:inline-block;padding:0.25rem 0.5rem;border:1px dashed ${warningBorder};background:${warningSurface};color:${warningText};font:600 0.75rem ${font};}${css}</style>`;

  if (/<\/head>/i.test(body))
    return body.replace(/<\/head>/i, `${style}</head>`);
  return `<!doctype html><html><head><meta charset="utf-8">${style}</head><body>${body}</body></html>`;
}
