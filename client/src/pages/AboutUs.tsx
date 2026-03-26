import { Link } from "wouter";
import { ArrowLeft, Heart, BookOpen, GraduationCap, Printer, Phone, Mail } from "lucide-react";

const SERVICES = [
  {
    icon: BookOpen,
    title: "Writing Workshops & Author Mentorship",
    bullets: [
      "Structured, hands-on writing workshops for all skill levels",
      "One-on-one author mentorship throughout the writing journey",
      "Curriculum covering narrative structure, voice, genre craft, and revision",
      "Pairing with a trained mentor from idea through polished manuscript",
    ],
    color: "from-teal-500 to-teal-700",
    light: "bg-teal-50",
    border: "border-teal-200",
    text: "text-teal-700",
    dot: "bg-teal-700",
  },
  {
    icon: GraduationCap,
    title: "Adult Literacy Testing & Training",
    bullets: [
      "Administration of standardized literacy evaluations",
      "Individualized instruction plans for adult learners",
      "Foundational reading, writing, and comprehension skill-building",
      "Structured progress tracking and milestone celebrations",
    ],
    color: "from-blue-500 to-blue-700",
    light: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    dot: "bg-blue-700",
  },
  {
    icon: Printer,
    title: "Publishing Assistance",
    bullets: [
      "Professional editing and manuscript review",
      "Cover design and interior formatting",
      "ISBN registration and copyright filing",
      "Distribution coordination",
      "Partnership with The Indie Quill LLC for every program graduate",
    ],
    color: "from-purple-500 to-purple-700",
    light: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    dot: "bg-purple-700",
  },
];

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center text-slate-600 hover:text-teal-600 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-red-50 rounded-full px-4 py-2 mb-4">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">501(c)(3) Non-Profit Organization</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            The Indie Quill Collective
          </h1>
          <p className="text-gray-500 text-lg">Protecting Young Voices. Building Futures.</p>
        </div>

        <div className="text-center py-6 mb-8 space-y-4 max-w-3xl mx-auto">
          <p className="font-display text-xl md:text-2xl font-bold text-slate-800">
            Vision: Empowering marginalized voices to overcome every obstacle and finally be heard.
          </p>
          <p className="text-base md:text-lg text-gray-700 leading-relaxed">
            Mission: To provide the essential writing curriculum, literacy support, and publishing infrastructure that moves authors—regardless of race, religion, or background—from their first word to their first edition.
          </p>
        </div>

        <section className="mb-8">
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold text-slate-800 mb-2">
              Our Services
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              The Indie Quill Collective actively provides the following programs and services to the communities we serve.
            </p>
          </div>

          <div className="space-y-6">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.title}
                  className={`bg-white rounded-2xl shadow-sm border ${service.border} p-8`}
                >
                  <div className="flex items-start gap-5">
                    <div className={`w-14 h-14 rounded-xl ${service.light} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-7 h-7 ${service.text}`} />
                    </div>
                    <div>
                      <h3 className={`font-display text-xl font-bold ${service.text} mb-3`}>
                        {service.title}
                      </h3>
                      <ul className="space-y-1.5">
                        {service.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2 text-gray-700">
                            <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${service.dot}`} />
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 rounded-2xl shadow-lg p-8 mb-8 text-white">
          <h2 className="font-display text-2xl font-bold mb-6 text-center">
            Celebrating Every Voice
          </h2>
          <p className="text-slate-200 text-center mb-8 max-w-2xl mx-auto">
            We stand with and uplift marginalized communities whose stories have been silenced for too long.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg" title="Intersex-Inclusive Progress Pride Flag">
              <svg viewBox="0 0 60 40" className="w-full h-full">
                <rect fill="#FF0018" width="60" height="6.67" y="0"/>
                <rect fill="#FFA52C" width="60" height="6.67" y="6.67"/>
                <rect fill="#FFFF41" width="60" height="6.67" y="13.33"/>
                <rect fill="#008018" width="60" height="6.67" y="20"/>
                <rect fill="#0000F9" width="60" height="6.67" y="26.67"/>
                <rect fill="#86007D" width="60" height="6.67" y="33.33"/>
                <polygon fill="#FFFFFF" points="0,0 20,20 0,40"/>
                <polygon fill="#FFAFC8" points="0,0 15,20 0,40"/>
                <polygon fill="#74D7EE" points="0,0 10,20 0,40"/>
                <polygon fill="#613915" points="0,0 5,20 0,40"/>
                <polygon fill="#000000" points="0,0 0,40 0,20"/>
                <circle cx="8" cy="20" r="4" fill="#FFDA00"/>
                <circle cx="8" cy="20" r="2.5" fill="#7902AA"/>
              </svg>
            </div>

            <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg relative" title="Pan-African Flag with Raised Fist">
              <svg viewBox="0 0 60 40" className="w-full h-full">
                <rect fill="#E31B23" width="60" height="13.33" y="0"/>
                <rect fill="#000000" width="60" height="13.34" y="13.33"/>
                <rect fill="#00853F" width="60" height="13.33" y="26.67"/>
                <g transform="translate(22, 5) scale(0.7)" fill="#FFD700">
                  <path d="M12 2C11 2 10 2.5 9.5 3.5L9 4C8.5 3.5 8 3 7 3C5.5 3 4.5 4 4.5 5.5C4.5 6 4.7 6.5 5 7L4 8C3.5 8.5 3 9.5 3 10.5V12C3 12 3 14 4 15L5 16V22C5 23 5.5 24 6.5 24H17.5C18.5 24 19 23 19 22V16L20 15C21 14 21 12 21 12V10.5C21 9.5 20.5 8.5 20 8L19 7C19.3 6.5 19.5 6 19.5 5.5C19.5 4 18.5 3 17 3C16 3 15.5 3.5 15 4L14.5 3.5C14 2.5 13 2 12 2ZM8 7H9V11H8V7ZM11 7H13V11H11V7ZM15 7H16V11H15V7Z"/>
                </g>
              </svg>
            </div>

            <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg" title="Hispanic Heritage">
              <svg viewBox="0 0 60 40" className="w-full h-full">
                <rect fill="#1E3A5F" width="60" height="12" y="0"/>
                <polygon fill="#FFFFFF" points="30,2 32,8 38,8 33,12 35,18 30,14 25,18 27,12 22,8 28,8"/>
                <rect fill="#D4A574" width="60" height="8" y="12"/>
                <polygon fill="#8B4513" points="0,12 5,16 10,12 15,16 20,12 25,16 30,12 35,16 40,12 45,16 50,12 55,16 60,12 60,20 0,20"/>
                <rect fill="#2563EB" width="60" height="7" y="20"/>
                <rect fill="#16A34A" width="60" height="7" y="27"/>
                <rect fill="#78350F" width="60" height="6" y="34"/>
              </svg>
            </div>

            <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg" title="Asian American & Pacific Islander">
              <svg viewBox="0 0 60 40" className="w-full h-full">
                <rect fill="#E63946" width="60" height="40"/>
                <rect fill="#F77F00" width="60" height="6" y="4"/>
                <path d="M0,7 Q5,4 10,7 Q15,10 20,7 Q25,4 30,7 Q35,10 40,7 Q45,4 50,7 Q55,10 60,7" stroke="#FFFFFF" strokeWidth="1.5" fill="none"/>
                <circle cx="5" cy="7" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="15" cy="7" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="25" cy="7" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="35" cy="7" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="45" cy="7" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="55" cy="7" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <rect fill="#F77F00" width="60" height="6" y="30"/>
                <path d="M0,33 Q5,30 10,33 Q15,36 20,33 Q25,30 30,33 Q35,36 40,33 Q45,30 50,33 Q55,36 60,33" stroke="#FFFFFF" strokeWidth="1.5" fill="none"/>
                <circle cx="5" cy="33" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="15" cy="33" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="25" cy="33" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="35" cy="33" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="45" cy="33" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="55" cy="33" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
              </svg>
            </div>

            <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg" title="Indigenous Peoples Flag">
              <svg viewBox="0 0 60 40" className="w-full h-full">
                <rect fill="#D32F2F" width="30" height="20" x="0" y="0"/>
                <rect fill="#000000" width="30" height="20" x="30" y="0"/>
                <rect fill="#FFD54F" width="30" height="20" x="0" y="20"/>
                <rect fill="#FFFFFF" width="30" height="20" x="30" y="20"/>
                <g transform="translate(30, 20)">
                  <polygon fill="#00BCD4" stroke="#FFFFFF" strokeWidth="0.5" points="0,-12 4,-8 12,-8 8,-4 8,4 12,8 4,8 0,12 -4,8 -12,8 -8,4 -8,-4 -12,-8 -4,-8"/>
                  <polygon fill="#FFFFFF" points="0,-6 6,0 0,6 -6,0"/>
                  <polygon fill="#FFD54F" points="0,-5 0,0 5,0"/>
                  <polygon fill="#D32F2F" points="0,0 0,5 -5,0"/>
                  <polygon fill="#000000" points="0,0 -5,0 0,-5"/>
                  <polygon fill="#FFFFFF" points="0,0 5,0 0,5"/>
                </g>
              </svg>
            </div>

            <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg" title="Disability Pride">
              <div className="w-full h-full bg-slate-900 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-full bg-red-500 transform -rotate-12 translate-x-[-6px]"></div>
                  <div className="w-1 h-full bg-yellow-400 transform -rotate-12 translate-x-[-3px]"></div>
                  <div className="w-1 h-full bg-white transform -rotate-12"></div>
                  <div className="w-1 h-full bg-blue-400 transform -rotate-12 translate-x-[3px]"></div>
                  <div className="w-1 h-full bg-green-500 transform -rotate-12 translate-x-[6px]"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 text-sm">
            <span className="bg-white/10 px-3 py-1 rounded-full">LGBTQIA+</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Black</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Hispanic/Latino</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Asian</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Indigenous</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Disabled</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Neurodivergent</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Youth</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Women</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Refugees</span>
          </div>
        </section>

        <section className="bg-gradient-to-br from-teal-700 to-teal-900 rounded-2xl shadow-lg p-8 mb-8 text-white">
          <h2 className="font-display text-2xl font-bold mb-2 text-center">
            Contact Us
          </h2>
          <p className="text-teal-100 text-center mb-8 max-w-xl mx-auto">
            To inquire about any of our services or to begin your journey with The Indie Quill Collective, reach out to us directly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <a
              href="mailto:jon@theindiequill.com"
              className="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-6 py-4 min-w-[220px]"
            >
              <Mail className="w-5 h-5 text-teal-200 flex-shrink-0" />
              <div>
                <p className="text-xs text-teal-300 font-medium uppercase tracking-wider">Email</p>
                <p className="text-white font-semibold">jon@theindiequill.com</p>
              </div>
            </a>
            <a
              href="tel:+18179132154"
              className="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-6 py-4 min-w-[220px]"
            >
              <Phone className="w-5 h-5 text-teal-200 flex-shrink-0" />
              <div>
                <p className="text-xs text-teal-300 font-medium uppercase tracking-wider">Phone</p>
                <p className="text-white font-semibold">+1 (817) 913-2154</p>
              </div>
            </a>
          </div>
        </section>

        <div className="text-center py-8">
          <Link href="/apply">
            <button className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors shadow-lg">
              Apply to Join the Collective
            </button>
          </Link>
          <p className="text-gray-500 text-sm mt-4">
            Ready to share your story? We're here to help you publish it.
          </p>
        </div>
      </div>
    </div>
  );
}
