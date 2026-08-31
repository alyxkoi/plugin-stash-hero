import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const content = `# Plugin Warehouse

> Plugin Warehouse is an online marketplace for music-production plugins, instruments, effects, libraries, and DAWs. We curate tools for producers, engineers, and composers, and run time-limited sales on featured titles.

## Pages

- [/](/): Home — browse highlighted plugins, active sales, and categories.
- [/shop](/shop): Browse the full catalog of plugins, instruments, effects, libraries, and DAWs.
- [/shop/:category](/shop/software): Filtered category pages for Software, Instruments, Libraries, DAWs, and Effects.
- [/shop/p/:slug](/shop/p): Individual product detail pages with descriptions, pricing, and purchase options.
- [/deals](/deals): Time-limited sale events and evergreen discounted plugin collections.
- [/search](/search): Search the plugin catalog by name, category, or tag.
- [/our-story](/our-story): The story behind Plugin Warehouse and our mission.
- [/faq](/faq): Frequently asked questions about purchasing, licensing, and downloads.
- [/contact-us](/contact-us): Contact form and support information.
- [/privacy-policy](/privacy-policy): Privacy policy and data practices.
- [/terms-of-service](/terms-of-service): Terms of service and usage agreement.
`;

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(content, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
