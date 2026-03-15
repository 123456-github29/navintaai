import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Send, CheckCircle, Mail, User, MessageSquare } from "lucide-react";

export default function Contact() {
  const [, navigate] = useLocation();
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

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#050505" }}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Message Sent</h2>
          <p className="text-white/30 mb-8">
            Thank you for reaching out. We'll get back to you as soon as possible.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-8 py-3 bg-white text-black rounded-full text-sm font-medium hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#050505" }}>
      <header className="border-b border-white/[0.06] bg-[#050505]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/40" />
          </button>
          <h1 className="text-lg font-semibold text-white">Contact Us</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-3">
            Get in Touch
          </h2>
          <p className="text-white/30 text-base leading-relaxed">
            Have a question, feature request, or feedback? We'd love to hear from you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs text-white/40 font-medium mb-1.5">Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full pl-10 pr-4 py-3 border border-white/[0.06] rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-colors bg-white/[0.03]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/40 font-medium mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-10 pr-4 py-3 border border-white/[0.06] rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-colors bg-white/[0.03]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/40 font-medium mb-1.5">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-colors bg-white/[0.03] appearance-none"
            >
              <option value="" className="bg-[#111]">General Inquiry</option>
              <option value="Feature Request" className="bg-[#111]">Feature Request</option>
              <option value="Bug Report" className="bg-[#111]">Bug Report</option>
              <option value="Billing Question" className="bg-[#111]">Billing Question</option>
              <option value="Partnership" className="bg-[#111]">Partnership</option>
              <option value="Other" className="bg-[#111]">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/40 font-medium mb-1.5">Message</label>
            <div className="relative">
              <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-white/20" />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                required
                rows={5}
                className="w-full pl-10 pr-4 py-3 border border-white/[0.06] rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-colors bg-white/[0.03] resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !name.trim() || !email.trim() || !message.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-black rounded-full text-sm font-medium hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Message
              </>
            )}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-white/[0.06] text-center">
          <p className="text-sm text-white/20">
            You can also reach us directly at{" "}
            <a href="mailto:rushil@navinta.org" className="text-indigo-400 hover:underline">
              rushil@navinta.org
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
