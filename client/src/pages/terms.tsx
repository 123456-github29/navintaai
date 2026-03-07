import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { LEGAL_CONFIG } from "@/lib/legal-config";

export default function TermsOfService() {
  useEffect(() => {
    document.title = "Terms of Service - Navinta AI";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Navinta AI Terms of Service - Read the terms and conditions that govern your use of our AI-powered video production platform.");
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
            <h1 className="text-3xl sm:text-4xl font-bold text-[#111111] mb-4">Navinta AI Terms of Service</h1>
            <p className="text-[#666666] font-medium">Effective Date: {LEGAL_CONFIG.effectiveDate}</p>
            <p className="text-[#666666] font-medium">Last Updated: {LEGAL_CONFIG.lastUpdated}</p>
          </header>

          <div className="prose prose-slate max-w-none text-[#111111] leading-relaxed space-y-6">
            <p>
              These Terms of Service ("Terms") govern your access to and use of the Services provided by <strong>Navinta AI</strong> ("Navinta AI," "we," "us," or "our"). The "Services" include navinta.org, our apps, APIs, and related functionality.
            </p>

            <p className="font-semibold">
              By accessing or using the Services, you agree to these Terms. If you do not agree, do not use the Services.
            </p>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">1) Eligibility and Account</h2>
              <p className="mb-3">
                You must be at least 13 years old (or the minimum age in your jurisdiction) to use the Services. You are responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>maintaining the confidentiality of your account</li>
                <li>all activity under your account</li>
                <li>providing accurate information</li>
              </ul>
              <p className="mt-3">
                We may suspend or terminate accounts for violations of these Terms or for security reasons.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">2) Subscriptions, Billing, and Trials</h2>
              <p className="mb-3">Some features may require a paid subscription.</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Prices, plan features, and billing intervals are displayed in the Services.</li>
                <li>Billing is handled by our payment processor (e.g., Stripe).</li>
                <li>Taxes may apply.</li>
                <li>If a payment fails, we may suspend paid features until resolved.</li>
              </ul>

              <h3 className="text-lg font-semibold text-[#111111] mt-6 mb-3">Watermarks and Feature Gating</h3>
              <p>
                Free or lower-tier plans may include limitations (e.g., watermarks, export restrictions, AI feature limits). You may preview features, but exporting certain results may require an upgrade.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">3) User Content and Licenses</h2>
              <p className="mb-3">
                "Your Content" includes any text, media, and other materials you upload, record, or generate using the Services.
              </p>
              <p>
                You retain ownership of Your Content. By using the Services, you grant Navinta AI a limited, worldwide, non-exclusive license to host, store, reproduce, process, adapt, and display Your Content solely to:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-3">
                <li>operate and provide the Services</li>
                <li>generate outputs you request</li>
                <li>maintain and improve reliability and safety</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">4) Acceptable Use</h2>
              <p className="mb-3">You agree not to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>violate laws or third-party rights</li>
                <li>upload content you do not have rights to use</li>
                <li>attempt to bypass paywalls, entitlements, or security controls</li>
                <li>reverse engineer, scrape, or abuse the Services</li>
                <li>interfere with or disrupt the Services</li>
                <li>use the Services to generate or distribute harmful or illegal content</li>
              </ul>
              <p className="mt-3">
                We may remove content, restrict features, or suspend accounts to enforce these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">5) AI Outputs and Disclaimers</h2>
              <p className="mb-3">
                The Services may generate scripts, plans, captions, or other outputs using AI. You acknowledge:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>outputs may be inaccurate, incomplete, or unsuitable</li>
                <li>you must review outputs before use</li>
                <li>you are responsible for compliance with laws, platform policies, and third-party rights</li>
                <li>Navinta AI does not guarantee results, virality, engagement, or revenue outcomes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">6) Intellectual Property</h2>
              <p>
                Navinta AI and its software, designs, and branding are owned by Navinta AI or its licensors. You may not copy, modify, distribute, or create derivative works except as allowed by law or with written permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">7) Third-Party Services</h2>
              <p>
                The Services may rely on third-party providers (e.g., hosting, AI services, storage, payment processors). Navinta AI is not responsible for third-party outages or changes. Third-party terms may apply.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">8) Privacy</h2>
              <p>
                Your use of the Services is also governed by the <Link href="/privacy" className="text-[#111111] font-medium hover:underline">Navinta AI Privacy Policy</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">9) Termination</h2>
              <p>
                You may stop using the Services at any time. We may suspend or terminate access if you violate these Terms or if we must do so for security, legal, or operational reasons.
              </p>
              <p className="mt-3">
                Upon termination, your access to paid features stops. Certain sections of these Terms survive (e.g., disclaimers, limitations of liability).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">10) Disclaimers</h2>
              <p className="font-semibold uppercase">
                THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE."
              </p>
              <p className="mt-3 uppercase">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, NAVINTA AI DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p className="mt-3">
                We do not warrant uninterrupted or error-free operation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">11) Limitation of Liability</h2>
              <p className="font-semibold mb-3 uppercase">TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
              <p className="uppercase">
                NAVINTA AI WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL.
              </p>
              <p className="mt-3 uppercase">
                OUR TOTAL LIABILITY FOR ANY CLAIM RELATED TO THE SERVICES IS LIMITED TO THE AMOUNT YOU PAID TO NAVINTA AI IN THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR $100 IF YOU HAVE NOT PAID.
              </p>
              <p className="mt-3">
                Some jurisdictions do not allow certain limitations; in that case, liability is limited to the greatest extent permitted.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">12) Indemnification</h2>
              <p className="mb-3">You agree to indemnify and hold harmless Navinta AI from claims arising out of:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Your Content</li>
                <li>your use of the Services</li>
                <li>your violation of these Terms</li>
                <li>your violation of third-party rights or laws</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">13) Changes to Services or Terms</h2>
              <p>
                We may modify the Services and these Terms. Changes take effect when posted. If you continue using the Services after changes, you accept the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">14) Governing Law; Disputes</h2>
              <p>
                These Terms are governed by the laws of {LEGAL_CONFIG.jurisdiction}, without regard to conflict of law principles. Disputes will be resolved in the courts located in {LEGAL_CONFIG.venue}, unless applicable law requires otherwise.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111111] mt-8 mb-4">15) Contact</h2>
              <p>Questions about these Terms:</p>
              <p className="mt-2">
                <strong>Navinta AI Support</strong><br />
                <a href={`mailto:${LEGAL_CONFIG.supportEmail}`} className="text-[#111111] font-medium hover:underline">{LEGAL_CONFIG.supportEmail}</a><br />
                {LEGAL_CONFIG.websiteUrl}
              </p>
            </section>
          </div>

          <footer className="mt-12 pt-8 border-t border-gray-100">
            <p className="text-[#666666] text-sm">
              If you have questions about these Terms of Service, please contact us at{" "}
              <a href={`mailto:${LEGAL_CONFIG.supportEmail}`} className="text-[#111111] font-medium hover:underline">{LEGAL_CONFIG.supportEmail}</a>
            </p>
          </footer>
        </article>

        <div className="mt-8 text-center">
          <Link href="/privacy" className="text-[#111111] hover:underline font-medium">
            View Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
