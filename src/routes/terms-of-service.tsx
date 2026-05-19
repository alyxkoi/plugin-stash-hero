import { createFileRoute } from "@tanstack/react-router";
import { StaticPage } from "@/components/StaticPage";

export const Route = createFileRoute("/terms-of-service")({
  head: () => ({ meta: [{ title: "Terms of Service — Plugin Warehouse" }] }),
  component: () => (
    <StaticPage
      eyebrow="// LAST UPDATED: MAY 2026"
      headline="TERMS OF SERVICE."
      sub="Educational presets only. Read before you download."
      sections={[
        {
          title: "1. EDUCATIONAL PURPOSE",
          body: (
            <p>
              All presets distributed through this site are provided strictly as educational resources to help users explore and learn the functionality
              of audio software. They are not commercial products and are not intended to replace any officially licensed software.
            </p>
          ),
        },
        {
          title: "2. LICENSE GRANTED",
          body: (
            <p>
              By downloading a preset, you receive a personal, non-exclusive, non-transferable license to use it for educational purposes only.
              You may not resell, redistribute, repackage, sublicense, or include the presets in any commercial bundle or product.
            </p>
          ),
        },
        {
          title: "3. NO RETURNS — DIGITAL GOODS",
          body: (
            <p>
              All items are digital and delivered instantly. Because of the nature of digital downloads, all sales are final and no returns, refunds,
              or exchanges are offered once a file has been delivered or downloaded. Please review product descriptions and compatibility information
              carefully before purchasing.
            </p>
          ),
        },
        {
          title: "4. INTELLECTUAL PROPERTY",
          body: (
            <p>
              All third-party software, plugin, and brand names referenced on this site are the property of their respective owners. Presets are
              independent configuration files and are not affiliated with or endorsed by any plugin or software manufacturer. Users must own a legal
              license to any host software they use the presets with.
            </p>
          ),
        },
        {
          title: "5. PROHIBITED USE",
          body: (
            <p>
              You may not use the site or its contents to facilitate piracy, share cracked software, distribute account credentials, reverse engineer
              the presets, or upload them to any redistribution platform. Accounts found doing so will be terminated without notice.
            </p>
          ),
        },
        {
          title: "6. NO WARRANTY",
          body: (
            <p>
              Presets are provided "as is" with no warranty of any kind. We do not guarantee compatibility, performance, stability, or safety when
              used with software that is not legally licensed by the user. We make reasonable efforts to keep files clean of malware but cannot
              guarantee it — downloads are at your own risk.
            </p>
          ),
        },
        {
          title: "7. LIMITATION OF LIABILITY",
          body: (
            <p>
              To the maximum extent permitted by law, we are not liable for any direct, indirect, incidental, consequential, or punitive damages
              arising from your use or inability to use the presets, including data loss, project corruption, or third-party software issues.
            </p>
          ),
        },
        {
          title: "8. DMCA & TAKEDOWNS",
          body: (
            <p>
              If you are a rights holder and believe content on this site infringes your rights, send a DMCA notice via our contact form with proof
              of ownership and the URLs in question. Verified claims are actioned promptly.
            </p>
          ),
        },
        {
          title: "9. DISPUTES",
          body: (
            <p>
              Any dispute arising from these terms or your use of the site shall be resolved through binding arbitration before any court proceeding.
              Governing law applies in the jurisdiction where the site operator is established.
            </p>
          ),
        },
        {
          title: "10. CHANGES TO THESE TERMS",
          body: (
            <p>
              We may update these terms from time to time. Continued use of the site after changes are posted constitutes acceptance of the updated terms.
            </p>
          ),
        },
      ]}
      footerCta={{ label: "QUESTIONS? CONTACT US →", to: "/contact-us" }}
    />
  ),
});
