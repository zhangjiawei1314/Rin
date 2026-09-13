// Custom "nav site" (网址导航) entries — a directory of links each with an
// icon + title, stored in client config under `nav_site.items` as a JSON array.
// This is independent from the site header navigation (`header.nav_items`).
// A dedicated public route will render these as a standalone navigation page.

export const NAV_SITE_CONFIG_KEY = "nav_site.items";

export interface NavSiteItem {
  /** Entry title shown below the icon. */
  title: string;
  /** Destination URL — in-app path (`/timeline`) or absolute URL. */
  url: string;
  /** Emoji character or image URL for the entry icon. */
  icon: string;
  /** Optional short description shown on hover/tooltip. */
  description?: string;
  /** Optional sort weight; insertion order is kept when omitted. */
  order?: number;
  /** Hide the entry without deleting it. */
  enabled?: boolean;
}

export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || /^\/\//.test(url);
}

/** True when the string looks like an image URL (used as <img src>). */
export function isImageUrl(icon: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif)$/i.test(icon.trim());
}

/**
 * Lenient parser: admin config travels as JSON over the wire and older rows may
 * store a plain string, so never throw — return null to mean "empty".
 */
export function parseNavSiteItems(raw: unknown): NavSiteItem[] | null {
  let value: unknown = raw;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      value = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(value)) return null;

  const items = value
    .map((entry): NavSiteItem | null => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title.trim() : "";
      const url = typeof record.url === "string" ? record.url.trim() : "";
      const icon = typeof record.icon === "string" ? record.icon.trim() : "";
      if (!title || !url) return null;
      const description =
        typeof record.description === "string" ? record.description.trim() || undefined : undefined;
      const order =
        typeof record.order === "number" && Number.isFinite(record.order) ? record.order : undefined;
      const enabled = record.enabled === false ? false : true;
      return { title, url, icon: icon || "🔗", description, order, enabled };
    })
    .filter((item): item is NavSiteItem => item !== null);

  return items.length > 0 ? items : null;
}

/** Enabled entries only, ordered by `order` while preserving insertion order. */
export function resolveNavSiteItems(raw: unknown): NavSiteItem[] {
  const items = parseNavSiteItems(raw) ?? [];
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.enabled !== false)
    .sort((a, b) => {
      const orderA = a.item.order ?? a.index;
      const orderB = b.item.order ?? b.index;
      return orderA - orderB;
    })
    .map(({ item }) => item);
}

export function serializeNavSiteItems(items: NavSiteItem[]): string {
  return JSON.stringify(items);
}
