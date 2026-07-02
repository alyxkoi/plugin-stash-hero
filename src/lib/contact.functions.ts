import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendEmail, FROM_CONTACT, CONTACT_INBOX } from "@/lib/resend.server";
import { renderContactNotification } from "@/lib/email-templates.server";

const ContactSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  subject: z.string().trim().min(1, "Subject required").max(150),
  message: z.string().trim().min(1, "Message required").max(5000),
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ContactSchema.parse(data))
  .handler(async ({ data }) => {
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
      console.error("[contact] email send failed:", send.error);
      return { ok: false as const, error: "Could not send your message. Try again." };
    }
    return { ok: true as const };
  });
