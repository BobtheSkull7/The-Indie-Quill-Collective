import { Link } from "wouter";
import { ArrowLeft, Heart } from "lucide-react";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center text-slate-600 hover:text-collective-teal mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-red-50 rounded-full px-4 py-2 mb-4">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">501(c)(3) Non-Profit</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            About The Indie Quill Collective
          </h1>
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">
            Our Vision
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed">
            A future where authorship is a fundamental right, not a guarded privilege—where the barriers of systemic bias are permanently neutralized, and the global narrative is a true reflection of all human experience.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">
            Our Mission
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed">
            To dismantle the systemic architectures of forced silence. We provide a radical, frictionless path to authorship for youth and disadvantaged adults whose voices have been muted by racism, misogyny, bigotry, and age discrimination. By providing the specific systems, tools, and direct human assistance required to bypass traditional gatekeepers, we ensure that those historically ignored are finally empowered as published authorities of their own narratives.
          </p>
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
            
            <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg" title="Indigenous Peoples">
              <div className="w-full h-full bg-gradient-to-r from-amber-600 via-red-700 to-amber-600"></div>
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

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">
            The Condition of Forced Silence
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-4">
            The literary landscape is not a meritocracy; it is a fortress. For many, silence is not a choice—it is a condition forced upon them by systemic barriers. Traditional gatekeepers have built a framework of exclusion that effectively mutes marginalized voices, ensuring their stories never leave their minds and their vital histories are erased before they are even told.
          </p>
          <p className="text-gray-700 text-lg leading-relaxed">
            When the tools of storytelling are guarded by those who do not value these perspectives, the result is a systemic erasure of entire communities, cultures, and generations. We exist to end this silence.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-6">
            Our Path to Authorship
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            The Indie Quill Collective was built to shatter this silence. We provide a path that removes the barriers—social, technical, and financial—that have been used to keep people quiet.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 border border-teal-200">
              <h3 className="font-display font-semibold text-slate-800 mb-2">Systemic Removal of Barriers</h3>
              <p className="text-gray-600 text-sm">
                We identify and neutralize the hurdles that prevent a story from reaching the page.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <h3 className="font-display font-semibold text-slate-800 mb-2">Integrated Support</h3>
              <p className="text-gray-600 text-sm">
                We provide the direct human assistance and infrastructure necessary to turn the act of speaking into the act of publishing.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
              <h3 className="font-display font-semibold text-slate-800 mb-2">Ownership and Legacy</h3>
              <p className="text-gray-600 text-sm">
                We move beyond mere representation toward true ownership, where marginalized voices finally control their own data and their own legacies.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-collective-teal to-collective-blue rounded-2xl shadow-lg p-8 mb-8 text-white">
          <h2 className="font-display text-2xl font-bold mb-4">
            A Sustainable Movement
          </h2>
          <p className="text-lg leading-relaxed opacity-90">
            We believe in building for the long term. By syncing our mission-driven work with a robust commercial infrastructure, we ensure that every voice we amplify helps fund the next. Every successful author in our program creates the "seed money" and the momentum needed for the next marginalized voice to be heard.
          </p>
        </section>

        <div className="text-center py-8">
          <Link href="/apply">
            <button className="bg-collective-teal hover:bg-teal-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors shadow-lg">
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
