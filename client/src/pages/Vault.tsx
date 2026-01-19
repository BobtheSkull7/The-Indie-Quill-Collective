import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import { FileText, Copy, Check, ExternalLink, Shield, Users, Scale, MessageSquare } from "lucide-react";

interface VaultDocument {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  content: string;
  externalLink?: string;
}

const VAULT_DOCUMENTS: VaultDocument[] = [
  {
    id: "guardian-consent",
    title: "Guardian Consent & Zero-PII Disclosure",
    icon: <Shield className="w-5 h-5" />,
    description: "The legal bridge for minors - explains our anonymous-first data protection approach.",
    content: `GUARDIAN CONSENT & ZERO-PII DISCLOSURE

The Indie Quill Collective uses an "Anonymous-First" system to protect minor authors. 

KEY POINTS:
• No full names or photos are used in any public-facing materials
• Authors are identified by First Name + Emoji only (e.g., "Sarah 📚")
• All personally identifiable information is stored securely and never shared with third parties
• Guardian consent is required for all authors under 18
• Data retention follows COPPA guidelines with automatic deletion schedules

By signing, you acknowledge:
1. Your child's work may be published under their chosen pen name
2. The Collective will never publicly disclose your child's full legal name
3. You have the right to request data deletion at any time
4. All communications will go through the designated guardian

Contact: privacy@theindiequillcollective.com`,
  },
  {
    id: "code-of-conduct",
    title: "Author Code of Conduct",
    icon: <Users className="w-5 h-5" />,
    description: "The 'Chevron' roadmap - our seven-stage publishing journey.",
    content: `THE INDIE QUILL COLLECTIVE - AUTHOR CODE OF CONDUCT

THE CHEVRON PATH TO PUBLICATION

Stage 1: AGREEMENT ✍️
You and your guardian will sign your publishing agreement.

Stage 2: CREATION 📝
We mentor you through your writing journey with helpful tools to assist with formatting, book cover, and specific page insertions.

Stage 3: EDITING 📖
We edit your manuscript and set up your professional ISBN and Copyright filing.

Stage 4: REVIEW 🔍
We provide a thorough review of the manuscript and suggest genres or specific changes.

Stage 5: MODIFICATIONS ✏️
The writer performs changes to finalize the book.
(Note: This stage can be repeated as needed to ensure excellence.)

Stage 6: PUBLISHED 📚
Your book goes live in the Bookstore!

Stage 7: MARKETING 🎉
We provide the launch day party and throw in a round of free marketing to kickstart your success.

AUTHOR COMMITMENTS:
✓ Respond to communications within 7 days
✓ Meet agreed-upon deadlines
✓ Maintain professional conduct
✓ Support fellow Collective authors
✓ Promote your work through available channels

MOMENTUM IS OUR GOAL - We move forward together.`,
  },
  {
    id: "conflict-of-interest",
    title: "Conflict of Interest Policy",
    icon: <Scale className="w-5 h-5" />,
    description: "Compensation transparency for board members and staff.",
    content: `CONFLICT OF INTEREST POLICY

THE INDIE QUILL COLLECTIVE - 501(c)(3)

DIRECTOR STATEMENT:
"Applying Carvana supply-chain principles to ensure $0 of your donation is wasted on manual overhead."

COMPENSATION TRANSPARENCY:
• Board members receive NO compensation for their service
• Staff salaries are disclosed in annual 990 filings
• All vendor relationships are disclosed and competitively bid
• No board member may financially benefit from Collective contracts

AUTHOR RELATIONSHIP:
• Authors retain all rights to their work
• Publishing services are provided at no cost to accepted authors
• Authors may purchase additional copies at wholesale pricing
• No royalty splits - authors keep 100% of any sales revenue

DONOR ASSURANCE:
• 100% of per-capita sponsorships go directly to author services
• Administrative costs are funded separately from author sponsorships
• Efficiency savings serve MORE authors, not overhead
• All allocations are auditable and reported to donors

Report concerns: ethics@theindiequillcollective.com`,
  },
  {
    id: "pilot-feedback",
    title: "Pilot Feedback Form",
    icon: <MessageSquare className="w-5 h-5" />,
    description: "Google Form link for our Friendly 4 pilot participants.",
    content: `FRIENDLY 4 PILOT - FEEDBACK FORM

Thank you for being part of our founding pilot program!

Your feedback helps us improve the experience for future authors.

Please share:
• What worked well in your onboarding experience?
• What was confusing or could be improved?
• How was communication throughout the process?
• Would you recommend the Collective to other aspiring authors?
• Any additional suggestions?

All feedback is confidential and used solely to improve our processes.`,
    externalLink: "https://forms.google.com/your-pilot-feedback-form",
  },
];

export default function Vault() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  if (!user || user.role !== "admin") {
    setLocation("/");
    return null;
  }

  const handleCopy = async (doc: VaultDocument) => {
    try {
      await navigator.clipboard.writeText(doc.content);
      setCopiedId(doc.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900">Form Vault</h1>
          <p className="text-gray-600 mt-2">
            Admin Resource Center - Standardized documents with one-click copy
          </p>
        </div>

        <div className="grid gap-6">
          {VAULT_DOCUMENTS.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-collective-teal/10 rounded-lg text-collective-teal">
                      {doc.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{doc.title}</h3>
                      <p className="text-gray-600 mt-1">{doc.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.externalLink && (
                      <a
                        href={doc.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-gray-400 hover:text-collective-teal hover:bg-collective-teal/10 rounded-lg transition-colors"
                        title="Open external link"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(doc);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        copiedId === doc.id
                          ? "bg-green-100 text-green-700"
                          : "bg-collective-teal/10 text-collective-teal hover:bg-collective-teal/20"
                      }`}
                    >
                      {copiedId === doc.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {expandedDoc === doc.id && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 bg-white p-4 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                    {doc.content}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">Quick Reference</h4>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex gap-2">
                  <span className="font-medium text-blue-800">Guardian Consent:</span>
                  <span className="text-blue-700">"We use an 'Anonymous-First' system. No full names or photos. Only First Name + Emoji."</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium text-blue-800">The Chevron Path:</span>
                  <span className="text-blue-700">"Agreement → Creation → Editing → Review → Modifications → Published → Marketing. Momentum is our goal."</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium text-blue-800">Director Statement:</span>
                  <span className="text-blue-700">"Applying Carvana supply-chain principles to ensure $0 of your donation is wasted on manual overhead."</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
