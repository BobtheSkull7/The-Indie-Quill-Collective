import { Link } from "wouter";
import { BookOpen, Heart, Feather, ArrowLeft, Mail } from "lucide-react";

const masters = [
  { name: "Joseph Campbell", work: "The Hero with a Thousand Faces", concept: "The Hero's Journey" },
  { name: "Blake Snyder", work: "Save the Cat!", concept: "The Narrative Beat Sheet" },
  { name: "Strunk & White", work: "The Elements of Style", concept: "The Rules of Prose" },
  { name: "Robert McKee", work: "Story", concept: "The Principles of Substance" },
  { name: "K.M. Weiland", work: "Structuring Your Novel", concept: "The Architecture of Conflict" },
];

const pillars = [
  { name: "The Indie Quill Collective", role: "Founding Visionary" },
  { name: "The Founding 25", role: "Honoring our first cohort of student-donors" },
  { name: "Digital Infrastructure Grant", role: "Future funding partner" },
  { name: "The Community Heartbeat", role: "Recognizing our local neighborhood partners" },
];

const advisors = [
  { name: "To Be Announced", genre: "Speculative Fiction Advisor", status: "Invited" },
  { name: "To Be Announced", genre: "Non-Fiction & Memoir Mentor", status: "Invited" },
  { name: "To Be Announced", genre: "Poetry & Verse Consultant", status: "Invited" },
];

export default function Community() {

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #faf6f0 0%, #f5efe6 40%, #ede4d6 100%)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1
            className="text-4xl sm:text-5xl font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', serif", color: "#2c1810" }}
          >
            The Fellowship of the Quill
          </h1>
          <div className="w-24 h-0.5 bg-amber-700 mx-auto mb-6 opacity-60" />
          <p
            className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#5c4a3a" }}
          >
            No story is written in isolation. We celebrate the masters who taught us, the patrons
            who fund us, and the authors who inspire us.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <section
            className="rounded-2xl p-6 sm:p-8 border"
            style={{
              background: "linear-gradient(135deg, #fffbf5 0%, #faf3e8 100%)",
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
                The Masters of Craft
              </h2>
            </div>
            <p
              className="text-sm mb-6"
              style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#7a6a5a", lineHeight: "1.6" }}
            >
              The literary giants whose wisdom forms the bedrock of our curriculum.
            </p>
            <ul className="space-y-5">
              {masters.map((master, i) => (
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
              background: "linear-gradient(135deg, #f8f5ff 0%, #f0ebfa 100%)",
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
                Our Pillars
              </h2>
            </div>
            <p
              className="text-sm mb-6"
              style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#7a6a8a", lineHeight: "1.6" }}
            >
              The donors and foundations whose generosity makes our mission possible.
            </p>
            <ul className="space-y-5">
              {pillars.map((pillar, i) => (
                <li key={i} className="border-b pb-4" style={{ borderColor: "#dcd0e8" }}>
                  <p
                    className="text-base font-semibold"
                    style={{ fontFamily: "'Playfair Display', serif", color: "#2c1830" }}
                  >
                    {pillar.name}
                  </p>
                  <p
                    className="text-sm"
                    style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#8a7a9a" }}
                  >
                    {pillar.role}
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
                Support Our Mission
              </Link>
            </div>
          </section>

          <section
            className="rounded-2xl p-6 sm:p-8 border"
            style={{
              background: "linear-gradient(135deg, #f0f8f5 0%, #e6f3ee 100%)",
              borderColor: "#a8d4c0",
              boxShadow: "0 4px 24px rgba(44, 24, 16, 0.08)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "#c0e8d8" }}
              >
                <Feather className="w-5 h-5" style={{ color: "#2a6b4c" }} />
              </div>
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', serif", color: "#1a3a2a" }}
              >
                The Author Advisory
              </h2>
            </div>
            <p
              className="text-sm mb-6"
              style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#5a7a6a", lineHeight: "1.6" }}
            >
              Published authors we are pursuing for mentorship and future guest Lessons.
            </p>
            <ul className="space-y-5">
              {advisors.map((advisor, i) => (
                <li key={i} className="border-b pb-4" style={{ borderColor: "#c0e0d0" }}>
                  <p
                    className="text-base font-semibold"
                    style={{ fontFamily: "'Playfair Display', serif", color: "#1a3020" }}
                  >
                    {advisor.name}
                  </p>
                  <p
                    className="text-sm"
                    style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#6a8a7a" }}
                  >
                    {advisor.genre}
                  </p>
                  <span
                    className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full"
                    style={{ background: "#d0f0e0", color: "#2a6b4c", fontWeight: 600 }}
                  >
                    {advisor.status}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-4 border-t" style={{ borderColor: "#c0e0d0" }}>
              <a
                href="mailto:community@theindiequillcollective.org"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: "linear-gradient(135deg, #3a8a6a 0%, #2a6b4c 100%)",
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(42, 107, 76, 0.3)",
                }}
              >
                <Mail className="w-4 h-4" />
                Join the Advisory
              </a>
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
    </div>
  );
}
