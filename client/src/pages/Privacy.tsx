import { useLocation } from "wouter";

export default function Privacy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-slate-700 hover:text-teal-600 transition-colors"
          >
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-full" />
            <span className="font-display font-bold text-lg">The Indie Quill Collective</span>
          </button>
          <span className="text-xs text-red-400 font-medium">501(c)(3) Non-Profit</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="font-display text-4xl font-bold text-slate-800 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: February 2026</p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-8">
          <section>
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              The Indie Quill Collective ("we," "us," or "our") is a 501(c)(3) non-profit organization
              dedicated to supporting emerging authors of all ages. We are committed to protecting
              your privacy and ensuring the security of your personal information. This Privacy Policy
              explains how we collect, use, and safeguard your data when you use our website and
              mobile applications, including VibeScribe.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">2. Information We Collect</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Account Information</h3>
                <p>
                  When you register, we collect your name, email address, date of birth (for age verification
                  and COPPA compliance), and chosen pen name. For minor authors, we also collect guardian
                  contact information.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Writing & Content Data</h3>
                <p>
                  We store manuscripts, drafts, task submissions, and other written content you create
                  within the platform. This data is kept securely in your private workspace.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Usage Data</h3>
                <p>
                  We collect standard usage information such as login activity, page views, and
                  feature usage to improve our services.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-teal-50 rounded-lg p-6 border border-teal-100">
            <h2 className="font-display text-2xl font-bold text-teal-800 mb-4">
              3. VibeScribe — Supplemental Policy
            </h2>
            <div className="space-y-4 text-teal-900 leading-relaxed">
              <div>
                <h3 className="font-semibold mb-2">Audio Data Collection</h3>
                <p>
                  VibeScribe collects voice recordings solely for the purpose of transcription and
                  task generation. Audio is processed as a temporary buffer and is not stored
                  permanently on our servers after transcription is complete.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">AI Processing (OpenAI)</h3>
                <p>
                  We use OpenAI's Whisper API to convert your voice to text. By using the app, you
                  acknowledge that your audio data will be transmitted to OpenAI for processing. We
                  utilize OpenAI's API platform, which (under our current agreement) does not use
                  API-submitted data to train their global models.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Data Retention</h3>
                <p>
                  Transcripts are stored securely in your private workspace and are never sold to
                  third parties.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">4. Protection of Minors (COPPA Compliance)</h2>
            <div className="space-y-3 text-gray-600 leading-relaxed">
              <p>
                We take the protection of children's privacy seriously. For authors under 13, we require
                verifiable parental/guardian consent before collecting any personal information.
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>No full names or photos are used in any public-facing materials</li>
                <li>Authors are identified by first name and emoji only in public contexts</li>
                <li>All personally identifiable information is stored securely and never shared with third parties</li>
                <li>Guardian consent is required for all authors under 18</li>
                <li>Data retention follows COPPA guidelines with automatic deletion schedules</li>
                <li>Guardians have the right to request data deletion at any time</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">5. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We employ industry-standard security measures including encrypted connections (HTTPS),
              secure session management with httpOnly cookies, password hashing with cryptographic
              salts, SQL injection protection via parameterized queries, and role-based access controls.
              Your data is hosted on secure, SOC 2 compliant infrastructure.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">6. Third-Party Services</h2>
            <div className="space-y-3 text-gray-600 leading-relaxed">
              <p>We use the following third-party services in the operation of our platform:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong>OpenAI (Whisper API)</strong> — Voice-to-text transcription for VibeScribe</li>
                <li><strong>Stripe</strong> — Secure payment processing for donations</li>
                <li><strong>Resend</strong> — Transactional email delivery</li>
                <li><strong>Supabase</strong> — Database hosting and management</li>
              </ul>
              <p>
                Each of these services maintains their own privacy policies and data handling
                practices. We only share the minimum data necessary for each service to function.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">7. Your Rights</h2>
            <div className="space-y-3 text-gray-600 leading-relaxed">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Access your personal data</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your account and associated data</li>
                <li>Export your data in a portable format</li>
                <li>Withdraw consent for data processing at any time</li>
                <li>Revoke AI/audio processing consent through app settings</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">8. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              For questions about this Privacy Policy, to exercise your data rights, or to report
              a privacy concern, please contact us at{" "}
              <a
                href="mailto:jon@theindiequill.com"
                className="text-teal-600 hover:text-teal-700 underline"
              >
                jon@theindiequill.com
              </a>
            </p>
          </section>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          &copy; {new Date().getFullYear()} The Indie Quill Collective. All rights reserved.
        </p>
      </main>
    </div>
  );
}
