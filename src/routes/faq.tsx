import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  CircleHelp,
  Download,
  Laptop,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

type FaqItem = { q: string; a: string };
type FaqGroup = { cat: string; description: string; icon: typeof Download; items: FaqItem[] };

const FAQS: FaqGroup[] = [
  {
    cat: "Getting started",
    description: "Orders, accounts, and finding your downloads.",
    icon: Download,
    items: [
      {
        q: "How do downloads work?",
        a: "After checkout, your plugins appear in your library instantly. Re-download whenever you need to. Links stay tied to your account.",
      },
      {
        q: "Do I need an account?",
        a: "Your account keeps your library organized and lets you re-download forever. Guest checkout still works, and we email the download links so nothing gets lost.",
      },
    ],
  },
  {
    cat: "Plugins and compatibility",
    description: "DAWs, formats, operating systems, and requirements.",
    icon: Laptop,
    items: [
      {
        q: "Which DAWs are supported?",
        a: "Ableton, FL Studio, Logic, Pro Tools, Studio One, Cubase, Reaper, and anything else that runs VST, VST3, AU, or AAX.",
      },
      {
        q: "Mac or PC?",
        a: "Both. Apple Silicon native support is included where the vendor provides it. Intel Mac and Windows compatibility are listed on every product page.",
      },
    ],
  },
  {
    cat: "Installation",
    description: "Getting a new plugin recognized by your setup.",
    icon: CircleHelp,
    items: [
      {
        q: "Why won't the plugin show up in my DAW?",
        a: "Rescan your plugin folder in your DAW, then restart it. That solves most cases. If it still does not appear, send us your DAW, operating system, and plugin name and we will walk you through it.",
      },
    ],
  },
  {
    cat: "Refunds and support",
    description: "Help with purchases, installation, and compatibility.",
    icon: ShieldCheck,
    items: [
      {
        q: "Can I get a refund?",
        a: "Read the return policy first. Because plugins are instant digital downloads, we troubleshoot installation and compatibility issues before refunding. Most problems get solved quickly.",
      },
    ],
  },
];

export const Route = createFileRoute("/faq")({
  head: () => {
    const title = "FAQ | Plugin Warehouse";
    const desc =
      "Answers to common questions about Plugin Warehouse downloads, DAW compatibility, installation on Mac and PC, refunds and support.";
    const url = "https://www.thepluginwarehouse.com/faq";
    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.flatMap((group) =>
        group.items.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      ),
    };
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(faqLd) }],
    };
  },
  component: FaqPage,
});

function FaqPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return FAQS;
    return FAQS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.q.toLowerCase().includes(normalizedQuery) ||
          item.a.toLowerCase().includes(normalizedQuery),
      ),
    })).filter((group) => group.items.length > 0);
  }, [query]);

  const totalMatches = filtered.reduce((total, group) => total + group.items.length, 0);

  return (
    <div className="support-page support-page--faq">
      <header className="support-hero support-hero--faq">
        <div className="support-hero__copy">
          <span className="support-kicker">Support center</span>
          <h1>
            QUESTIONS,
            <br />
            ANSWERED.
          </h1>
          <p>
            Downloads, compatibility, installation, and orders. Find the answer without digging
            through a manual.
          </p>
        </div>

        <div className="support-search-panel">
          <label htmlFor="faq-search">What can we help with?</label>
          <div className="support-search">
            <Search aria-hidden="true" />
            <input
              id="faq-search"
              type="search"
              placeholder="Search downloads, DAWs, refunds..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear FAQ search">
                <X aria-hidden="true" />
              </button>
            )}
          </div>
          <p aria-live="polite">
            {query
              ? `${totalMatches} ${totalMatches === 1 ? "answer" : "answers"} found`
              : `${FAQS.reduce((total, group) => total + group.items.length, 0)} answers across four topics`}
          </p>
        </div>
      </header>

      <main className="faq-content">
        {filtered.length ? (
          filtered.map((group) => {
            const Icon = group.icon;
            return (
              <section className="faq-group" key={group.cat}>
                <header className="faq-group__heading">
                  <span className="faq-group__icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <h2>{group.cat}</h2>
                    <p>{group.description}</p>
                  </div>
                </header>

                <div className="faq-accordion">
                  {group.items.map((item) => (
                    <details key={item.q} open={query ? true : undefined}>
                      <summary>
                        <span>{item.q}</span>
                        <ChevronDown aria-hidden="true" />
                      </summary>
                      <div className="faq-answer">
                        <p>{item.a}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <div className="support-empty">
            <Search aria-hidden="true" />
            <h2>No answer found</h2>
            <p>Try a shorter search or send the support team a message.</p>
            <button type="button" className="btn-ghost" onClick={() => setQuery("")}>
              Clear search
            </button>
          </div>
        )}
      </main>

      <aside className="support-cta">
        <div>
          <span>Need a human?</span>
          <h2>TELL US WHAT IS HAPPENING.</h2>
          <p>Include the plugin, your DAW, and your operating system for the fastest answer.</p>
        </div>
        <Link to="/contact-us" className="btn-primary">
          Contact support <ArrowRight aria-hidden="true" />
        </Link>
      </aside>
    </div>
  );
}
