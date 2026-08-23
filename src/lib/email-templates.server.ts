// Transactional templates: order confirmation (06) and the internal contact
// form notification (07). The HTML lives verbatim in email-html.server.ts.
import { escapeHtml } from "./resend.server";
import { ORDER_CONFIRMATION_HTML, CONTACT_MESSAGE_HTML } from "./email-html.server";
import { fill, money, removeEmptyChips, renderExtras } from "./email-render.server";

const FALLBACK_COVER = "https://thepluginwarehouse.com/og-cover.jpg";

type OrderItem = {
  name: string;
  price: number;
  /**
   * Entitlement-checked download link. It resolves (302) to the R2 custom
   * domain thepluginwarehousefiles.com — never the R2 S3 API endpoint, which
   * truncates files at 2GB.
   */
  downloadUrl: string;
  coverUrl?: string | null;
};

function cover(it: OrderItem) {
  return it.coverUrl && it.coverUrl.startsWith("http") ? it.coverUrl : FALLBACK_COVER;
}

export function renderOrderConfirmation(opts: {
  orderNumber: string;
  customerEmail: string;
  items: OrderItem[];
  total: number;
  orderUrl: string;
  orderDate?: Date;
}): { html: string; text: string; subject: string } {
  const { orderNumber, items, total } = opts;
  const ordered = [...items].sort((a, b) => b.price - a.price);
  const hero = ordered[0]!;
  const extras = ordered.slice(1);

  const orderDate = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
    .format(opts.orderDate ?? new Date())
    .toUpperCase();

  let html = renderExtras(
    ORDER_CONFIRMATION_HTML,
    extras.map((it) => ({
      ITEM_IMAGE: cover(it),
      ITEM_NAME: escapeHtml(it.name),
      ITEM_DOWNLOAD_URL: it.downloadUrl,
    })),
  );

  html = fill(html, {
    ORDER_NUMBER: escapeHtml(orderNumber),
    ORDER_DATE: orderDate,
    ORDER_TOTAL: money(total),
    HERO_IMAGE: cover(hero),
    HERO_NAME: escapeHtml(hero.name),
    HERO_PRICE: money(hero.price),
    HERO_ORIGINAL: "",
    HERO_DOWNLOAD_URL: hero.downloadUrl,
  });

  const text = [
    `Order ${orderNumber} — your download links`,
    "",
    ...ordered.map((i) => `• ${i.name} — ${money(i.price)}\n  ${i.downloadUrl}`),
    "",
    `Total paid: ${money(total)}`,
    `Order page: ${opts.orderUrl}`,
    "",
    "Need help? https://www.thepluginwarehouse.com/contact-us",
    "",
  ].join("\n");

  return {
    html: removeEmptyChips(html),
    text,
    subject: `Order ${orderNumber} — your download links`,
  };
}

export function renderContactNotification(opts: {
  name: string;
  email: string;
  subject: string;
  message: string;
  orderId?: string | null;
  receivedAt?: Date;
}): { html: string; text: string; subject: string } {
  const receivedAt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(opts.receivedAt ?? new Date())
    .toUpperCase();

  const html = fill(CONTACT_MESSAGE_HTML, {
    SUBMITTER_NAME: escapeHtml(opts.name),
    SUBMITTER_EMAIL: escapeHtml(opts.email),
    SUBJECT: escapeHtml(opts.subject),
    ORDER_ID: escapeHtml(opts.orderId || "Not provided"),
    RECEIVED_AT: `${receivedAt} CT`,
    MESSAGE_BODY: escapeHtml(opts.message),
  });

  const text = [
    `Contact form: ${opts.subject}`,
    "",
    `From: ${opts.name} <${opts.email}>`,
    `Order: ${opts.orderId || "Not provided"}`,
    `Received: ${receivedAt} CT`,
    "",
    opts.message,
    "",
    `Reply directly to ${opts.email}.`,
    "",
  ].join("\n");

  return { html, text, subject: `Contact form: ${opts.subject}` };
}
