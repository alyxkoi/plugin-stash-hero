import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, Clock3, Headphones, Loader2, Mail, Send } from "lucide-react";
import { submitContactMessage } from "@/lib/contact.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/contact-us")({
  head: () => ({
    meta: [
      { title: "Contact | Plugin Warehouse" },
      {
        name: "description",
        content: "Get in touch with Plugin Warehouse. Most replies arrive within a few hours.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.thepluginwarehouse.com/contact-us" }],
  }),
  component: Contact,
});

const SUBJECT_LABEL: Record<string, string> = {
  install: "Install help",
  refund: "Refund",
  order: "Order issue",
  compat: "Plugin compatibility",
  general: "General",
};

function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("general");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const resetForm = () => {
    setDone(false);
    setName("");
    setEmail("");
    setSubject("general");
    setMessage("");
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await submitContactMessage({
        data: {
          name: name.trim(),
          email: email.trim(),
          subject: SUBJECT_LABEL[subject] ?? subject,
          message: message.trim(),
        },
      });
      if (result.ok) {
        setDone(true);
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    } catch (error) {
      toast.error((error as Error).message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="support-page support-page--contact">
      <header className="support-hero support-hero--contact">
        <div className="support-hero__copy">
          <span className="support-kicker">Human support</span>
          <h1>
            LET'S GET YOU
            <br />
            BACK TO MAKING.
          </h1>
          <p>Tell us what went wrong. A real person will help you sort it out.</p>
        </div>

        <div className="contact-direct">
          <div className="contact-direct__icon">
            <Headphones aria-hidden="true" />
          </div>
          <div>
            <span>Direct email</span>
            <a href="mailto:pluginwh@gmail.com">pluginwh@gmail.com</a>
          </div>
          <Mail aria-hidden="true" />
        </div>
      </header>

      <main className="contact-layout">
        <aside className="contact-guidance">
          <h2>A FASTER ANSWER STARTS WITH THE DETAILS.</h2>
          <p>
            For technical issues, include the plugin name, your DAW, your operating system, and what
            you have already tried.
          </p>

          <div className="contact-facts">
            <div>
              <Clock3 aria-hidden="true" />
              <span>
                <strong>Quick response</strong>Most messages are answered within a few hours.
              </span>
            </div>
            <div>
              <Headphones aria-hidden="true" />
              <span>
                <strong>Producer-friendly help</strong>No scripted runaround or generic support
                loops.
              </span>
            </div>
          </div>

          <Link to="/faq" className="contact-faq-link">
            Check the FAQ first <ArrowRight aria-hidden="true" />
          </Link>
        </aside>

        <section className="contact-form-panel" aria-label="Contact support form">
          {done ? (
            <div className="contact-success" role="status">
              <span className="contact-success__mark">
                <Check aria-hidden="true" />
              </span>
              <h2>MESSAGE RECEIVED.</h2>
              <p>
                Thanks, {name || "we have it"}. We will reply to <strong>{email}</strong> as soon as
                possible.
              </p>
              <button type="button" onClick={resetForm} className="btn-ghost">
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="contact-form-panel__heading">
                <span>Send a message</span>
                <p>All fields are required.</p>
              </div>

              <div className="contact-field-row">
                <label className="contact-field" htmlFor="contact-name">
                  <span>Name</span>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                  />
                </label>
                <label className="contact-field" htmlFor="contact-email">
                  <span>Email</span>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@email.com"
                  />
                </label>
              </div>

              <label className="contact-field" htmlFor="contact-subject">
                <span>What do you need help with?</span>
                <select
                  id="contact-subject"
                  name="subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                >
                  <option value="install">Install help</option>
                  <option value="refund">Refund</option>
                  <option value="order">Order issue</option>
                  <option value="compat">Plugin compatibility</option>
                  <option value="general">General question</option>
                </select>
              </label>

              <label className="contact-field" htmlFor="contact-message">
                <span>Message</span>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  minLength={10}
                  maxLength={5000}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Tell us what happened and include any useful details."
                />
                <small>{message.length.toLocaleString()} / 5,000</small>
              </label>

              <button type="submit" disabled={submitting} className="btn-primary contact-submit">
                {submitting ? (
                  <>
                    <Loader2 className="contact-spinner" aria-hidden="true" /> Sending
                  </>
                ) : (
                  <>
                    Send message <Send aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
