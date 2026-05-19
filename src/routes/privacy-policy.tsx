import { createFileRoute } from "@tanstack/react-router";
import { StaticPage } from "@/components/StaticPage";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Plugin Warehouse" }] }),
  component: () => (
    <StaticPage
      eyebrow="// LAST UPDATED: MAY 2026"
      headline="PRIVACY POLICY."
      sections={[
        {
          title: "1. PURPOSE AND SCOPE",
          body: (
            <p>
              <strong>Statement of Intent:</strong> This site provides educational resources in the form of software presets for learning purposes.
              These are not intended for commercial or unauthorized use but for educational exploration of software functionalities.
            </p>
          ),
        },
        {
          title: "2. DEFINITIONS",
          body: (
            <p>
              <strong>Presets:</strong> Referred to here as configurations or settings files that can be used within software for educational purposes only.
            </p>
          ),
        },
        {
          title: "3. INTELLECTUAL PROPERTY",
          body: (
            <p>
              <strong>Disclaimer:</strong> All software mentioned or referenced on this site is the intellectual property of their respective owners.
              The presets provided are for educational use and are not meant to infringe on any copyrights. Users are advised to only use these presets
              in conjunction with legally obtained software.
            </p>
          ),
        },
        {
          title: "4. USE OF PRESETS",
          body: (
            <p>
              <strong>Educational Use Only:</strong> Users agree to use the presets for educational purposes only. Using these presets for commercial
              or any non-educational activities is strictly prohibited.
            </p>
          ),
        },
        {
          title: "5. LIABILITY",
          body: (
            <>
              <p>
                <strong>No Guarantee:</strong> This site does not guarantee the functionality, compatibility, or safety of the presets when used with
                software not legally owned by the user. We are not liable for any damage, data loss, or legal issues arising from the misuse of the presets.
              </p>
              <p>
                <strong>Malware Disclaimer:</strong> We make every effort to ensure the presets are free from malware, but we cannot guarantee this.
                Users download at their own risk.
              </p>
            </>
          ),
        },
        {
          title: "6. ACCESS AND USE",
          body: (
            <>
              <p>
                <strong>Access:</strong> We do not guarantee continuous access to our site or the availability of any preset. Users must have legal
                rights to the software they intend to use with our presets.
              </p>
              <p>
                <strong>Product Representation:</strong> Presets are provided "as is" without any warranties regarding their performance or effect within
                software. Descriptions are for educational guidance only.
              </p>
            </>
          ),
        },
        {
          title: "7. DISPUTE RESOLUTION",
          body: (
            <p>
              <strong>Arbitration:</strong> Any disputes related to the use of this site or its contents shall be resolved through binding arbitration to avoid litigation.
            </p>
          ),
        },
        {
          title: "8. LEGAL COMPLIANCE",
          body: (
            <p>
              <strong>User Responsibility:</strong> It is the user's responsibility to ensure that their use of the presets complies with all applicable laws,
              including copyright laws. We do not condone or facilitate piracy.
            </p>
          ),
        },
        {
          title: "9. DMCA NOTICE",
          body: (
            <p>
              <strong>Takedown Policy:</strong> If you are a copyright holder and believe your rights are being infringed, please notify us with a DMCA takedown notice.
              We will respond promptly by removing the content in question or disabling access. This process is part of our commitment to respect intellectual
              property rights and to avoid legal action from copyright holders.
            </p>
          ),
        },
        {
          title: "10. PRIVACY",
          body: (
            <p>
              <strong>Data Collection:</strong> We collect minimal data necessary for transaction purposes, which is handled securely. We do not share personal
              information with third parties unless required by law.
            </p>
          ),
        },
        {
          title: "11. CHANGES TO THIS POLICY",
          body: (
            <p>
              <strong>Updates:</strong> This privacy policy may be updated to reflect changes in our practices or for other operational, legal, or regulatory reasons.
              Users are encouraged to review this policy periodically.
            </p>
          ),
        },
        {
          title: "12. CONTACT INFORMATION",
          body: (
            <p>
              <strong>Contact Us:</strong> For any questions or concerns regarding our privacy policy or practices, please contact us by filling out the contact form.
            </p>
          ),
        },
      ]}
      footerCta={{ label: "QUESTIONS? CONTACT US →", to: "/contact-us" }}
    />
  ),
});
