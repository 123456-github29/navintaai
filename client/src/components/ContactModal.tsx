import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Send, CheckCircle, Mail, User, MessageSquare } from "lucide-react";

interface ContactModalProps {
  onClose: () => void;
}

export function ContactModal({ onClose }: ContactModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setSending(true);
    setError(null);

    try {
      await apiRequest("POST", "/api/contact", {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim() || "General Inquiry",
        message: message.trim(),
      });
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      />
      <div
        className="relative rounded-3xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: "linear-gradient(180deg, #111111 0%, #0a0a0a 100%)", boxShadow: "0 40px 80px rgba(0,0,0,0.8)", animation: "contactModalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        <style>{`
          @keyframes contactModalIn {
            from { opacity: 0; transform: scale(0.95) translateY(8px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/5 transition-colors z-10"
        >
          <XMarkIcon className="w-5 h-5 text-white/30" aria-hidden="true" />
        </button>

        {sent ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Message Sent</h2>
            <p className="text-white/40 text-sm leading-relaxed mb-6">
              Thank you for reaching out. We'll get back to you as soon as possible.
            </p>
            <button
              onClick={onClose}
              className="px-7 py-2.5 bg-white text-black rounded-full text-sm font-semibold hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-white tracking-tight mb-1.5">
                Get in Touch
              </h2>
              <p className="text-white/35 text-sm leading-relaxed">
                Have a question, feature request, or feedback? We'd love to hear from you.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-white/50 mb-1.5">
                  Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" aria-hidden="true" />
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name…"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-colors bg-white/[0.03]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-white/50 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" aria-hidden="true" />
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com…"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-colors bg-white/[0.03]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-subject" className="block text-sm font-medium text-white/50 mb-1.5">
                  Subject
                </label>
                <select
                  id="contact-subject"
                  name="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-colors bg-white/[0.03] appearance-none"
                >
                  <option value="" className="bg-[#111] text-white">General Inquiry</option>
                  <option value="Feature Request" className="bg-[#111] text-white">Feature Request</option>
                  <option value="Bug Report" className="bg-[#111] text-white">Bug Report</option>
                  <option value="Billing Question" className="bg-[#111] text-white">Billing Question</option>
                  <option value="Partnership" className="bg-[#111] text-white">Partnership</option>
                  <option value="Other" className="bg-[#111] text-white">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-white/50 mb-1.5">
                  Message
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-white/20" aria-hidden="true" />
                  <textarea
                    id="contact-message"
                    name="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help…"
                    required
                    rows={4}
                    className="w-full pl-10 pr-4 py-3 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-colors bg-white/[0.03] resize-none"
                  />
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl" role="alert" aria-live="polite">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={sending || !name.trim() || !email.trim() || !message.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-black rounded-full text-sm font-semibold hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" aria-hidden="true" />
                    Send Message
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/[0.06] text-center">
              <p className="text-xs text-white/25">
                Or email us directly at{" "}
                <a href="mailto:rushil@navinta.org" className="text-white/60 font-medium hover:underline">
                  rushil@navinta.org
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
