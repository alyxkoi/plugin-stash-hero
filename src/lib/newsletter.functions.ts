import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { subscribeToMailchimp } from "@/lib/mailchimp.server";

const Schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  source: z.string().trim().max(60).optional(),
});

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Schema.parse(data))
  .handler(async ({ data }) => {
    const tags = ["newsletter"];
    if (data.source) tags.push(data.source);
    const res = await subscribeToMailchimp({ email: data.email, tags });
    if (!res.ok) return { ok: false as const, error: "Couldn't subscribe you right now. Try again." };
    return { ok: true as const };
  });
