import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { subscribeToMailchimp } from "@/lib/mailchimp.server";

const NewsletterSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  source: z.string().trim().max(60).optional(),
});

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => NewsletterSchema.parse(data))
  .handler(async ({ data }) => {
    const tags = ["newsletter"];
    if (data.source) tags.push(data.source);
    const res = await subscribeToMailchimp({ email: data.email, tags });
    if (!res.ok) {
      const msg =
        res.status === 400
          ? "That email looks invalid. Double-check and try again."
          : "Couldn't subscribe you right now. Try again.";
      return { ok: false as const, error: msg };
    }
    return { ok: true as const };
  });

const CustomerSchema = z.object({
  email: z.string().trim().email().max(255),
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  source: z.enum(["signup", "checkout"]).optional(),
});

export const subscribeCustomer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CustomerSchema.parse(data))
  .handler(async ({ data }) => {
    const tags = ["customer"];
    if (data.source) tags.push(data.source);
    const mergeFields: Record<string, string> = {};
    if (data.firstName) mergeFields.FNAME = data.firstName;
    if (data.lastName) mergeFields.LNAME = data.lastName;
    // Fire-and-forget: swallow errors so signup/checkout never fails.
    const res = await subscribeToMailchimp({
      email: data.email,
      tags,
      mergeFields: Object.keys(mergeFields).length ? mergeFields : undefined,
    });
    return { ok: res.ok };
  });

