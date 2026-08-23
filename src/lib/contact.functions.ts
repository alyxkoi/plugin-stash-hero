import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendEmail, FROM_CONTACT, CONTACT_INBOX } from "@/lib/resend.server";
import { renderContactNotification } from "@/lib/email-templates.server";

const ContactSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  subject: z.string().trim().min(1, "Subject required").max(150),
  message: z.string().trim().min(1, "Message required").max(5000),
  orderNumber: z.string().trim().max(40).optional(),
});

/** Most recent order for this email, so the notification carries context. */
async function latestOrderNumber(email: string): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("orders")
      .select("number")
      .eq("guest_email", email.trim().toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data?.number as string | undefined) ?? null;
  } catch {
    return null;
  }
}

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ContactSchema.parse(data))
  .handler(async ({ data }) => {
    const orderId = data.orderNumber?.trim() || (await latestOrderNumber(data.email));
    const rendered = renderContactNotification({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      orderId,
      receivedAt: new Date(),
    });
    const send = await sendEmail({
      from: FROM_CONTACT,
      to: CONTACT_INBOX,
      // 07 replies must reach the customer, not the shop inbox.
      reply_to: data.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (send.error) {
      console.error("[contact] email send failed:", send.error);
      return { ok: false as const, error: "Could not send your message. Try again." };
    }
    return { ok: true as const };
  });
