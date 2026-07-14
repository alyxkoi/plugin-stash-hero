// Fire-and-forget Telegram notifier. Never throws — Telegram outages must
// not break checkout, email, or download flows.

export async function notifyTelegram(text: string): Promise<void> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      console.log("[telegram] skipped — missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
      return;
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[telegram] send failed", res.status, body);
    }
  } catch (e) {
    console.error("[telegram] send threw", e);
  }
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatSaleMessage(orderNumber: string, itemCount: number, totalCents: number): string {
  return `✅ SALE — ${orderNumber}\n${itemCount} item${itemCount === 1 ? "" : "s"} · ${formatMoney(totalCents)}`;
}

export function formatFailureMessage(orderNumber: string | null, itemCount: number, totalCents: number): string {
  const header = orderNumber ? `❌ FAILED — ${orderNumber}` : `❌ FAILED`;
  return `${header}\n${itemCount} item${itemCount === 1 ? "" : "s"} · ${formatMoney(totalCents)}`;
}
