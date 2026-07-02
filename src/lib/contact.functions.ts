import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { sendEmail, FROM_CONTACT, CONTACT_INBOX } from "@/lib/resend.server";
import { renderContactNotification } from "@/lib/email-templates.server";

const ContactSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  subject: z.string().trim().min(1, "Subject required").max(150),
  message: z.string().trim().min(1, "Message required").max(5000),
});

async function optionalUserId(): Promise<string | null> {
  try {
    const req = getRequest();
    const authHeader = req?.headers?.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    if (!token) return null;
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await sb.auth.getClaims(token);
    return (data?.claims?.sub as string | undefined) ?? null;
  } catch {
    return null;
  }
}

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ContactSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await optionalUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: insertErr } = await supabaseAdmin.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      user_id: userId,
    });
    if (insertErr) {
      console.error("[contact] insert failed", insertErr);
      return { ok: false as const, error: "Could not save your message. Try again." };
    }

    const rendered = renderContactNotification(data);
    const send = await sendEmail({
      from: FROM_CONTACT,
      to: CONTACT_INBOX,
      reply_to: data.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (send.error) {
      // Message is saved either way — surface a soft warning but treat as success.
      console.error("[contact] email send failed:", send.error);
    }
    return { ok: true as const };
  });
