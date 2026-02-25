import { useState } from "react";
import { Link } from "wouter";
import { BookOpen, Heart, Feather, ArrowLeft, Mail, Users } from "lucide-react";
import ContactModal from "../components/ContactModal";

const lineage = [
  { name: "Joseph Campbell", work: "The Hero with a Thousand Faces", concept: "The Hero's Journey" },
  { name: "Jerry Jenkins", work: "The Left Behind Series", concept: "The 21-Point Check" },
  { name: "James Michener", work: "Hawaii & The Source", concept: "The Sense of Place" },
  { name: "Jenna Rainey", work: "The Creative Entrepreneur", concept: "Visual Storytelling" },
  { name: "The Novelry", work: "The Golden Hour", concept: "Structural Physics" },
];

const partners = [
  { name: "The Indie Quill Collective", role: "Founding Visionary" },
  { name: "The Founding 25", role: "Members who joined during our inaugural season." },
  { name: "The Open Ledger", role: "Transparency in our mission and funding." },
];

const council = [
  { name: "Fiction Lead", status: "Vacant - Applications Open", badge: "Recruiting" },
  { name: "Non-Fiction Lead", status: "Vacant - Applications Open", badge: "Recruiting" },
  { name: "Poetry Consultant", status: "Vacant - Applications Open", badge: "Recruiting" },
];

const paperGrainBg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`;

export default function Community() {
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #faf6f0 0%, #f5efe6 40%, #ede4d6 100%)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1
            className="text-4xl sm:text-5xl font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', serif", color: "#2c1810" }}
          >
            The Quill Collective
          </h1>
          <div className="w-24 h-0.5 bg-amber-700 mx-auto mb-6 opacity-60" />
          <p
            className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#5c4a3a" }}
          >
            Where community supports the voices of tomorrow.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <section
            className="rounded-2xl p-6 sm:p-8 border"
            style={{
              backgroundColor: "#FDFBF7",
              backgroundImage: paperGrainBg,
              backgroundSize: "200px 200px",
              borderColor: "#d4c4a8",
              boxShadow: "0 4px 24px rgba(44, 24, 16, 0.08)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "#e8d5b7" }}
              >
                <BookOpen className="w-5 h-5" style={{ color: "#6b4c2a" }} />
              </div>
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', serif", color: "#3a2a1a" }}
              >
                The Lineage
              </h2>
            </div>
            <p
              className="text-sm mb-6"
              style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#7a6a5a", lineHeight: "1.6" }}
            >
              The voices that guide our curriculum and inspire our standards.
            </p>
            <ul className="space-y-5">
              {lineage.map((master, i) => (
                <li key={i} className="border-b pb-4" style={{ borderColor: "#e8d5b7" }}>
                  <p
                    className="text-base font-semibold"
                    style={{ fontFamily: "'Playfair Display', serif", color: "#2c1810" }}
                  >
                    {master.name}
                  </p>
                  <p
                    className="text-sm italic"
                    style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#8a7a6a" }}
                  >
                    {master.work}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#998877", letterSpacing: "0.05em" }}>
                    {master.concept}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="rounded-2xl p-6 sm:p-8 border"
            style={{
              backgroundColor: "#FDFBF7",
              backgroundImage: paperGrainBg,
              backgroundSize: "200px 200px",
              borderColor: "#c8b8d8",
              boxShadow: "0 4px 24px rgba(44, 24, 16, 0.08)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "#e0d0f0" }}
              >
                <Heart className="w-5 h-5" style={{ color: "#6b4c8a" }} />
              </div>
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', serif", color: "#3a2a4a" }}
              >
                Our Partners
              </h2>
            </div>
            <p
              className="text-sm mb-6"
              style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#7a6a8a", lineHeight: "1.6" }}
            >
              The donors and foundations whose generosity makes our mission possible.
            </p>
            <ul className="space-y-5">
              {partners.map((partner, i) => (
                <li key={i} className="border-b pb-4" style={{ borderColor: "#dcd0e8" }}>
                  <p
                    className="text-base font-semibold"
                    style={{ fontFamily: "'Playfair Display', serif", color: "#2c1830" }}
                  >
                    {partner.name}
                  </p>
                  <p
                    className="text-sm"
                    style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#8a7a9a" }}
                  >
                    {partner.role}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-4 border-t" style={{ borderColor: "#dcd0e8" }}>
              <Link
                href="/donations"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: "linear-gradient(135deg, #7c5caa 0%, #5a3d8a 100%)",
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(90, 61, 138, 0.3)",
                }}
              >
                <Heart className="w-4 h-4" />
                Become a Patron
              </Link>
            </div>
          </section>

          <section
            className="rounded-2xl p-6 sm:p-8 border"
            style={{
              backgroundColor: "#FDFBF7",
              backgroundImage: paperGrainBg,
              backgroundSize: "200px 200px",
              borderColor: "#a8b8d4",
              boxShadow: "0 4px 24px rgba(44, 24, 16, 0.08)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "#c0d0e8" }}
              >
                <Users className="w-5 h-5" style={{ color: "#2a4c6b" }} />
              </div>
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', serif", color: "#1a2a3a" }}
              >
                The Writer's Council
              </h2>
            </div>
            <p
              className="text-sm mb-6"
              style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#5a6a7a", lineHeight: "1.6" }}
            >
              Active leadership roles shaping the future of our literary community.
            </p>
            <ul className="space-y-5">
              {council.map((member, i) => (
                <li key={i} className="border-b pb-4" style={{ borderColor: "#c0d0e0" }}>
                  <p
                    className="text-base font-semibold"
                    style={{ fontFamily: "'Playfair Display', serif", color: "#1a2030" }}
                  >
                    {member.name}
                  </p>
                  <p
                    className="text-sm"
                    style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#6a7a8a" }}
                  >
                    {member.status}
                  </p>
                  <span
                    className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full"
                    style={{ background: "#d0e0f0", color: "#2a4c6b", fontWeight: 600 }}
                  >
                    {member.badge}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-4 border-t" style={{ borderColor: "#c0d0e0" }}>
              <button
                onClick={() => setShowContactModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #3a5a8a 0%, #2a4c6b 100%)",
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(42, 76, 107, 0.3)",
                }}
              >
                <Mail className="w-4 h-4" />
                Apply for the Council
              </button>
            </div>
          </section>
        </div>

        <div className="text-center">
          <Link
            href="/student"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: "#7a6a5a" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Scribe Space
          </Link>
        </div>
      </div>

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        pageSource="Community Page — Writer's Council Application"
      />
    </div>
  );
}
