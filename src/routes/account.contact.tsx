import { createFileRoute } from "@tanstack/react-router";
import { HelpCircle, MessageSquare, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/account/contact")({
  head: () => ({ meta: [{ title: "Contact — Plugin Warehouse" }] }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-[0.95] tracking-tight">
          NEED A HAND?
        </h1>
        <p className="mt-4 text-[#C9BEDD] max-w-xl">
          Most questions are already answered in the FAQ. If you can't find what you need,
          reach out directly.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ContactCard
          href="https://www.thepluginwarehouse.com/faq"
          eyebrow="START HERE"
          title="FAQ"
          description="Installation, activation, refunds, and the most common fixes — all in one place."
          icon={<HelpCircle className="w-5 h-5" strokeWidth={1.8} />}
          primary
        />
        <ContactCard
          href="https://www.thepluginwarehouse.com/contact-us"
          eyebrow="STILL STUCK?"
          title="Contact Us"
          description="Send us a message and we'll get back to you. Include your order number for faster help."
          icon={<MessageSquare className="w-5 h-5" strokeWidth={1.8} />}
        />
      </div>
    </div>
  );
}

function ContactCard({
  href, eyebrow, title, description, icon, primary = false,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="glass-card p-6 md:p-8 block relative overflow-hidden group transition hover:-translate-y-0.5"
    >
      <div className="chromatic-edge" />
      <div className="glass-noise" />
      {primary && (
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF003C] to-transparent" />
      )}
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="inline-flex items-center gap-2 label-mini text-[#C9BEDD]">
            <span
              className={`w-8 h-8 rounded-full inline-flex items-center justify-center border ${
                primary
                  ? "bg-[#FF003C]/15 border-[#FF003C]/50 text-[#FF6A88]"
                  : "bg-[#0E0BD1]/15 border-[#0E0BD1]/50 text-white/85"
              }`}
            >
              {icon}
            </span>
            {eyebrow}
          </div>
          <ArrowUpRight
            className="w-5 h-5 text-white/40 group-hover:text-[#FF003C] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition"
            strokeWidth={1.8}
          />
        </div>
        <h2 className="mt-6 font-display text-3xl md:text-4xl tracking-tight">{title}</h2>
        <p className="mt-3 text-[#C9BEDD] text-sm md:text-base leading-relaxed max-w-md">
          {description}
        </p>
      </div>
    </a>
  );
}
