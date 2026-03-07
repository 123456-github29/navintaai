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
      <div className="min-h-screen bg-white flex items-center justify-center px-4" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#111827] mb-3">Message Sent</h2>
          <p className="text-[#6B7280] mb-8">
            Thank you for reaching out. We'll get back to you as soon as possible.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-8 py-3 bg-[#135BEC] text-white rounded-full text-sm font-medium hover:bg-[#0F4BD6] transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#6B7280]" />
          </button>
          <h1 className="text-lg font-semibold text-[#111827]">Contact Us</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-[#111827] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Get in Touch
          </h2>
          <p className="text-[#6B7280] text-base leading-relaxed">
            Have a question, feature request, or feedback? We'd love to hear from you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#135BEC]/20 focus:border-[#135BEC] transition-colors bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#135BEC]/20 focus:border-[#135BEC] transition-colors bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#135BEC]/20 focus:border-[#135BEC] transition-colors bg-white appearance-none"
            >
              <option value="">General Inquiry</option>
              <option value="Feature Request">Feature Request</option>
              <option value="Bug Report">Bug Report</option>
              <option value="Billing Question">Billing Question</option>
              <option value="Partnership">Partnership</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Message</label>
            <div className="relative">
              <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-[#9CA3AF]" />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                required
                rows={5}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#135BEC]/20 focus:border-[#135BEC] transition-colors bg-white resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !name.trim() || !email.trim() || !message.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#135BEC] text-white rounded-full text-sm font-medium hover:bg-[#0F4BD6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
          <p className="text-sm text-[#9CA3AF]">
            You can also reach us directly at{" "}
            <a href="mailto:rushil@navinta.org" className="text-[#135BEC] hover:underline">
              rushil@navinta.org
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
