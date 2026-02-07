import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import { FileText, Copy, Check, ExternalLink, Shield, Users, Scale, MessageSquare, Link2, Eye, RefreshCw } from "lucide-react";

interface VaultDocument {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  content: string;
  externalLink?: string;
}

interface PIIBridgeEntry {
  applicationId: number;
  pseudonym: string | null;
  legalName: string;
  email: string;
  identityMode: string;
  status: string;
  contractStatus: string | null;
  cohortLabel: string | null;
  createdAt: string;
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
  const [piiBridge, setPiiBridge] = useState<PIIBridgeEntry[]>([]);
  const [loadingBridge, setLoadingBridge] = useState(true);
  const [showBridge, setShowBridge] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
      return;
    }

    // Fetch PII Bridge data
    fetch("/api/admin/pii-bridge")
      .then((res) => res.json())
      .then((data) => setPiiBridge(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingBridge(false));
  }, [user, setLocation]);

  if (!user || user.role !== "admin") {
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

  const refreshBridge = () => {
    setLoadingBridge(true);
    fetch("/api/admin/pii-bridge")
      .then((res) => res.json())
      .then((data) => setPiiBridge(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingBridge(false));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": return "bg-green-100 text-green-700";
      case "migrated": return "bg-purple-100 text-purple-700";
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "under_review": return "bg-blue-100 text-blue-700";
      case "rejected": return "bg-red-100 text-red-700";
      case "rescinded": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900">Documentation</h1>
          <p className="text-gray-600 mt-2">
            Admin Resource Center - Standardized documents, templates, and Secure Identity Vault
          </p>
        </div>

        <div className="mb-8 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Link2 className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Secure Identity Vault</h2>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={refreshBridge}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${loadingBridge ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setShowBridge(!showBridge)}
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>{showBridge ? "Hide" : "Show"} Bridge</span>
              </button>
            </div>
          </div>
          <p className="text-slate-300 text-sm">
            The single source of truth linking Pseudonyms to Legal Names. Only you can see this data and trigger LLC sync.
          </p>
        </div>

        {showBridge && (
          <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loadingBridge ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
              </div>
            ) : piiBridge.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No applications found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Pseudonym</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Legal Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Identity</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Contract</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Cohort</th>
                    </tr>
                  </thead>
                  <tbody>
                    {piiBridge.map((entry) => (
                      <tr key={entry.applicationId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-teal-600">
                          {entry.pseudonym || <span className="text-gray-400 italic">No pseudonym</span>}
                        </td>
                        <td className="py-3 px-4 text-gray-900">{entry.legalName}</td>
                        <td className="py-3 px-4 text-gray-600">{entry.email}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            entry.identityMode === "safe" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {entry.identityMode === "safe" ? "Safe" : "Public"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                            {entry.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {entry.contractStatus ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              entry.contractStatus === "signed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {entry.contractStatus.replace("_", " ")}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {entry.cohortLabel || <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="p-4 bg-amber-50 border-t border-amber-200">
              <p className="text-xs text-amber-700">
                <strong>PII Firewall Reminder:</strong> Only pseudonyms are synced to the LLC. Legal names remain in NPO records only.
              </p>
            </div>
          </div>
        )}

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
                    <div className="p-3 bg-teal-50 rounded-lg text-teal-600">
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
                        className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
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
                          : "bg-teal-50 text-teal-600 hover:bg-teal-100"
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
