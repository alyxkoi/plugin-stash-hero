import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, X, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { subscribeNewsletter, subscribeCustomer } from "@/lib/newsletter.functions";
import { supabase } from "@/integrations/supabase/client";
import { validatePassword, PASSWORD_RULE_MESSAGE } from "@/lib/password";

const STORAGE_KEY = "pw_mystery_gift_seen_v1";
const COOKIE_KEY = "pw_mystery_gift_seen";

function hasSeen(): boolean {
  try {
    if (typeof window === "undefined") return true;
    if (localStorage.getItem(STORAGE_KEY)) return true;
  } catch {}
  if (typeof document !== "undefined" && document.cookie.includes(`${COOKIE_KEY}=1`)) return true;
  return false;
}

function markSeen() {
  try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
  try {
    const days = 365;
    const d = new Date(); d.setTime(d.getTime() + days * 864e5);
    document.cookie = `${COOKIE_KEY}=1; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
  } catch {}
}

type Step = "email" | "account" | "done";

export function MysteryGiftPopup() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasSeen()) return;
    const t = setTimeout(() => setOpen(true), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    markSeen();
  }

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const addr = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const res = await subscribeNewsletter({ data: { email: addr, source: "popup" } });
      if (!res.ok) {
        // Treat already-subscribed as success — still advance.
        if (!/invalid/i.test(res.error ?? "")) {
          // move on anyway; email likely already exists
        } else {
          setError(res.error ?? "Couldn't subscribe. Try again.");
          setBusy(false);
          return;
        }
      }
      setStep("account");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pwErr = validatePassword(password);
    if (pwErr) { setError(pwErr); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setBusy(true);
    const { data, error: signErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    if (signErr) {
      if (/already/i.test(signErr.message)) setError("An account with this email already exists. Try logging in.");
      else setError(signErr.message);
      setBusy(false);
      return;
    }
    if (!data.session) {
      // Confirm off — sign in directly
      const { error: siErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (siErr) { setError(siErr.message); setBusy(false); return; }
    }
    subscribeCustomer({ data: { email: email.trim(), source: "signup" } }).catch(() => {});
    setBusy(false);
    setStep("done");
    setTimeout(() => close(), 2200);
  }

  function skipAccount() {
    setStep("done");
    setTimeout(() => close(), 1600);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <button
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-[#0a0210]/75 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mgp-title"
            className="relative w-full max-w-md"
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="relative overflow-hidden rounded-2xl border border-white/10 p-7 sm:p-9 shadow-[0_30px_80px_-20px_rgba(255,0,60,0.35),0_0_60px_-10px_rgba(147,51,234,0.4)]"
              style={{
                background:
                  "radial-gradient(120% 90% at 50% 0%, rgba(255,45,110,0.18) 0%, rgba(76,20,90,0.85) 45%, rgba(28,8,44,0.95) 100%)",
                backdropFilter: "blur(24px) saturate(160%)",
              }}
            >
              {/* Close */}
              <button
                onClick={close}
                aria-label="Close"
                className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full text-white/35 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Glow blobs */}
              <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full opacity-70"
                style={{ background: "radial-gradient(closest-side, rgba(255,45,110,0.55), transparent 70%)", filter: "blur(20px)" }} />

              <div className="relative text-center">
                {step !== "done" && (
                  <div className="mb-5 flex justify-center">
                    <MysteryGift />
                  </div>
                )}

                {step === "email" && (
                  <>
                    <p className="font-mono text-[11px] tracking-[0.28em] text-[#FF2D6E] mb-2">MYSTERY GIFT</p>
                    <h2 id="mgp-title" className="text-2xl sm:text-3xl font-black text-white leading-tight">
                      Your free plugin<br />is waiting.
                    </h2>
                    <p className="mt-3 text-sm text-white/65">
                      Drop your email to unlock a mystery plugin — plus early access to drops & producer-only deals.
                    </p>
                    <form onSubmit={onEmailSubmit} className="mt-6 space-y-3">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@studio.com"
                        className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-white placeholder:text-white/35 outline-none focus:border-[#FF2D6E] focus:ring-2 focus:ring-[#FF2D6E]/40 transition"
                      />
                      {error && <div className="text-xs text-[#FF6A93] font-mono">{error}</div>}
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full rounded-xl px-4 py-3.5 font-bold tracking-wide text-white transition disabled:opacity-60"
                        style={{
                          background: "linear-gradient(90deg, #FF003C, #FF2D6E)",
                          boxShadow: "0 10px 30px -8px rgba(255,45,110,0.6), 0 0 20px rgba(255,0,60,0.35)",
                        }}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "CLAIM MY GIFT →"}
                      </button>
                    </form>
                    <p className="mt-4 text-[11px] text-white/40">No spam. Unsubscribe anytime.</p>
                  </>
                )}

                {step === "account" && (
                  <>
                    <p className="font-mono text-[11px] tracking-[0.28em] text-[#FF2D6E] mb-2">ONE MORE STEP (OPTIONAL)</p>
                    <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                      Create an account?
                    </h2>
                    <p className="mt-3 text-sm text-white/65">
                      Save your gift to a real account so you can re-download anytime.
                    </p>
                    <form onSubmit={onAccountSubmit} className="mt-6 space-y-3 text-left">
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-white placeholder:text-white/35 outline-none focus:border-[#FF2D6E] focus:ring-2 focus:ring-[#FF2D6E]/40 transition"
                      />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-white placeholder:text-white/35 outline-none focus:border-[#FF2D6E] focus:ring-2 focus:ring-[#FF2D6E]/40 transition"
                      />
                      <p className="text-[11px] font-mono text-white/45">{PASSWORD_RULE_MESSAGE}</p>
                      {error && <div className="text-xs text-[#FF6A93] font-mono">{error}</div>}
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full rounded-xl px-4 py-3.5 font-bold tracking-wide text-white transition disabled:opacity-60"
                        style={{
                          background: "linear-gradient(90deg, #FF003C, #FF2D6E)",
                          boxShadow: "0 10px 30px -8px rgba(255,45,110,0.6)",
                        }}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "CREATE ACCOUNT & LOG IN →"}
                      </button>
                      <button
                        type="button"
                        onClick={skipAccount}
                        className="w-full rounded-xl px-4 py-2.5 text-sm text-white/60 hover:text-white transition"
                      >
                        No thanks, just the gift
                      </button>
                    </form>
                  </>
                )}

                {step === "done" && (
                  <div className="py-6">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-full mb-4"
                      style={{ background: "linear-gradient(135deg, #FF003C, #FF2D6E)", boxShadow: "0 0 40px rgba(255,45,110,0.6)" }}>
                      <Check className="h-8 w-8 text-white" strokeWidth={3} />
                    </div>
                    <h2 className="text-2xl font-black text-white">You're in.</h2>
                    <p className="mt-2 text-sm text-white/65">Check your inbox — your mystery gift is on the way.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MysteryGift() {
  return (
    <div className="relative">
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(255,45,110,0.7), transparent 70%)", filter: "blur(18px)" }}
        animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.15, 0.9] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="relative grid h-20 w-20 place-items-center rounded-2xl border border-white/15"
        style={{
          background: "linear-gradient(135deg, rgba(255,0,60,0.35), rgba(147,51,234,0.35))",
          boxShadow: "0 0 30px rgba(255,45,110,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
        }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Gift className="h-10 w-10 text-white drop-shadow-[0_0_10px_rgba(255,45,110,0.8)]" strokeWidth={2} />
      </motion.div>
    </div>
  );
}
