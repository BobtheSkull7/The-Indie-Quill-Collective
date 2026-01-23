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
            
            <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg bg-black flex items-center justify-center" title="Black Power Raised Fist">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
                <path d="M12 2C10.5 2 9.2 2.9 8.5 4.2C7.8 3.5 6.8 3 5.7 3C3.6 3 2 4.6 2 6.7C2 7.8 2.5 8.8 3.2 9.5C2.9 10.2 2 11.5 2 12C2 14 4 15 6 15V22H18V15C20 15 22 14 22 12C22 11.5 21.1 10.2 20.8 9.5C21.5 8.8 22 7.8 22 6.7C22 4.6 20.4 3 18.3 3C17.2 3 16.2 3.5 15.5 4.2C14.8 2.9 13.5 2 12 2Z"/>
              </svg>
            </div>
            
            <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg" title="Hispanic Heritage">
              <div className="w-full h-full bg-gradient-to-r from-red-600 via-yellow-400 to-red-600"></div>
            </div>
            
            <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg" title="Asian Heritage">
              <div className="w-full h-full bg-gradient-to-b from-red-500 via-orange-400 to-yellow-300"></div>
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
