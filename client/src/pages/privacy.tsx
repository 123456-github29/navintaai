import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { LEGAL_CONFIG } from "@/lib/legal-config";

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Privacy Policy - Navinta AI";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Navinta AI Privacy Policy - Learn how we collect, use, and protect your personal information when using our AI-powered video production platform.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-[#666666] hover:text-[#111111] mb-8 font-medium">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <article className="bg-white rounded-3xl border border-gray-100 p-8 sm:p-12 shadow-sm">
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            This document is provided for informational purposes and may need review by qualified counsel for your jurisdiction.
          </div>

          <header className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#111111] mb-4">Navinta AI Privacy Policy</h1>
            <p className="text-[#666666] font-medium">Effective Date: {LEGAL_CONFIG.effectiveDate}</p>
            <p className="text-[#666666] font-medium">Last Updated: {LEGAL_CONFIG.lastUpdated}</p>
          </header>

          <div className="prose prose-slate max-w-none text-[#111111] leading-relaxed space-y-6">
            <p>
              This Privacy Policy explains how <strong>Navinta AI</strong> ("Navinta AI," "we," "us," or "our") collects, uses, discloses, and safeguards information when you visit or use our website at <strong>navinta.org</strong>, our applications, and related services (collectively, the "Services").
            </p>

            <p className="font-semibold">
              By using the Services, you agree to the practices described in this Privacy Policy.
            </p>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">1) Who We Are</h2>
              <p>
                Navinta AI provides an AI-assisted content planning and video creation workflow that helps users plan, record, compile, and export videos. We may process user inputs, uploaded media, and generated outputs to deliver the Services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">2) Information We Collect</h2>
              <p className="mb-3">We collect information in the following categories:</p>

              <h3 className="text-lg font-semibold text-[#111111] mt-6 mb-3">A. Information You Provide Directly</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Account information:</strong> name, email address, authentication identifiers (e.g., Google sign-in), and profile details you provide.</li>
                <li><strong>Onboarding and brand inputs:</strong> brand name, target audience, goals, tone, preferences, video length preferences, and any other free-text information you submit.</li>
                <li><strong>Customer support communications:</strong> messages and attachments you send to {LEGAL_CONFIG.supportEmail} or via in-app support.</li>
              </ul>

              <h3 className="text-lg font-semibold text-[#111111] mt-6 mb-3">B. Content You Upload or Create Using the Services</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>User-generated content:</strong> scripts, shot lists, content plans, captions, and other text you create or generate.</li>
                <li><strong>Media you record or upload:</strong> video clips, audio, images, and any associated metadata.</li>
                <li><strong>Generated outputs:</strong> compiled videos, captions files, thumbnails, and project artifacts.</li>
              </ul>

              <h3 className="text-lg font-semibold text-[#111111] mt-6 mb-3">C. Automatically Collected Information</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Device and usage information:</strong> IP address, browser type, device identifiers, pages/screens viewed, features used, clickstream data, and timestamps.</li>
                <li><strong>Log data and diagnostics:</strong> crash logs, performance metrics, and error reports.</li>
                <li><strong>Cookies and similar technologies:</strong> we may use cookies/local storage to maintain session state, preferences, and analytics.</li>
              </ul>

              <h3 className="text-lg font-semibold text-[#111111] mt-6 mb-3">D. Payment Information</h3>
              <p className="mb-3">
                If you purchase a subscription, payment processing is handled by <strong>Stripe</strong> or another payment provider. We generally do <strong>not</strong> store full payment card numbers. We may store:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>subscription status, plan tier, and entitlement flags</li>
                <li>Stripe customer IDs and subscription IDs</li>
                <li>billing history metadata needed to provide the Services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">3) How We Use Information</h2>
              <p className="mb-3">We use information to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Provide and operate the Services</strong> (authentication, content generation workflows, exports, and storage)</li>
                <li><strong>Personalize your experience</strong> (brand settings, preferences, project continuity)</li>
                <li><strong>Improve and debug</strong> (security monitoring, quality improvements, performance)</li>
                <li><strong>Communicate with you</strong> (service updates, support responses, transactional emails)</li>
                <li><strong>Billing and account management</strong> (subscriptions, entitlements, fraud prevention)</li>
                <li><strong>Compliance and safety</strong> (enforce policies, prevent abuse, comply with legal obligations)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">4) AI and Content Processing</h2>
              <p>
                Navinta AI may use third-party AI providers (e.g., Gemini, OpenAI, or others configured by the Services) to process your prompts and content to generate plans, scripts, captions, or other outputs.
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-3">
                <li>We send only the information needed to fulfill your request.</li>
                <li>AI outputs may be incorrect, incomplete, or inappropriate; you are responsible for reviewing outputs before publishing or relying on them.</li>
                <li>We do not guarantee that AI outputs are unique or free of third-party rights.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">5) How We Share Information</h2>
              <p className="mb-3">We may share information with:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Service providers</strong> who help operate the Services (hosting, databases, logging, analytics, storage, video processing, email delivery).</li>
                <li><strong>Payment processors</strong> (e.g., Stripe) for billing and subscription handling.</li>
                <li><strong>AI providers</strong> when you request AI features.</li>
                <li><strong>Legal and safety:</strong> where required by law, subpoena, or to protect rights, safety, and security.</li>
                <li><strong>Business transfers:</strong> if we are involved in a merger, acquisition, financing, or sale of assets.</li>
              </ul>
              <p className="mt-3">
                We do not sell your personal information in the traditional sense. If "sale" is defined broadly under certain laws, we will honor applicable opt-out rights where required.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">6) Data Retention</h2>
              <p className="mb-3">We retain personal information and content as long as necessary to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>provide the Services</li>
                <li>comply with legal requirements</li>
                <li>resolve disputes and enforce agreements</li>
              </ul>
              <p className="mt-3">
                You may request deletion of your account and associated data subject to legal and operational constraints (e.g., billing records, security logs, legal obligations).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">7) Security</h2>
              <p>
                We use reasonable administrative, technical, and physical safeguards designed to protect your information. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">8) Your Choices and Rights</h2>
              <p className="mb-3">Depending on your location, you may have rights to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>access your personal data</li>
                <li>correct inaccurate data</li>
                <li>delete your data</li>
                <li>object to or restrict certain processing</li>
                <li>data portability</li>
                <li>opt out of certain disclosures/uses where applicable</li>
              </ul>
              <p className="mt-3">
                To make a request, contact <strong>{LEGAL_CONFIG.supportEmail}</strong>. We may verify your identity before fulfilling requests.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">9) International Data Transfers</h2>
              <p>
                If you access the Services from outside the country where our systems are located, your data may be transferred and processed in other countries with different data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">10) Children's Privacy</h2>
              <p>
                The Services are not intended for children under 13 (or the minimum age in your jurisdiction). We do not knowingly collect personal data from children.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">11) Third-Party Links and Integrations</h2>
              <p>
                The Services may link to third-party sites or use third-party APIs. We are not responsible for their privacy practices. Please review third-party policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">12) Updates to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. The "Last Updated" date will change. Material changes may be communicated via the Services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">13) Contact Us</h2>
              <p>Questions or requests:</p>
              <p className="mt-2">
                <strong>Navinta AI Support</strong><br />
                Email: <a href={`mailto:${LEGAL_CONFIG.supportEmail}`} className="text-[#111111] font-medium hover:underline">{LEGAL_CONFIG.supportEmail}</a><br />
                Website: {LEGAL_CONFIG.websiteUrl}
              </p>
            </section>
          </div>

          <footer className="mt-12 pt-8 border-t border-gray-100">
            <p className="text-[#666666] text-sm">
              If you have questions about this Privacy Policy, please contact us at{" "}
              <a href={`mailto:${LEGAL_CONFIG.supportEmail}`} className="text-[#111111] font-medium hover:underline">{LEGAL_CONFIG.supportEmail}</a>
            </p>
          </footer>
        </article>

        <div className="mt-8 text-center">
          <Link href="/terms" className="text-[#111111] hover:underline font-medium">
            View Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
