import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Heart, ArrowRight, Shield, Lock, Globe, Users, TrendingUp, BookOpen, Handshake } from "lucide-react";

interface ImpactMetrics {
  totalAuthorsSupported: number;
  identityProtectionRate: number;
  activeCohortSize: number;
  signedContracts: number;
  publishedBooks: number;
  youthAuthorsSupported: number;
  lastUpdated: string;
}

const PUBLISHING_PHASES = [
  { id: 1, label: "Agreement", description: "Sign your publishing contract" },
  { id: 2, label: "Creation", description: "Write your manuscript" },
  { id: 3, label: "Editing", description: "Professional editing support" },
  { id: 4, label: "Review", description: "Final quality review" },
  { id: 5, label: "Modifications", description: "Make final revisions" },
  { id: 6, label: "Published", description: "Your book goes live" },
  { id: 7, label: "Marketing", description: "Promote your work" },
];

export default function Home() {
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/impact")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch metrics");
        return res.json();
      })
      .then((data) => {
        if (data && typeof data === 'object' && !data.error) {
          setMetrics(data);
        }
      })
      .catch(console.error)
      .finally(() => setMetricsLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      {/* SECTION 1: Hero - The Mission */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Heart className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium">501(c)(3) Non-Profit Organization</span>
            </div>
            
            <h1 className="font-display text-5xl md:text-6xl font-bold mb-4 leading-tight">
              The Indie Quill
              <span className="block text-red-500">Collective</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-200 mb-2 font-medium">
              Protecting Young Voices. Building Futures.
            </p>
            
            <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              We provide mentorship, resources, and a professional pathway to publishing
              for emerging authors of all ages.
            </p>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
      </section>

      {/* SECTION 2: Identity Bridge */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
              Identity Bridge
            </h2>
            <p className="text-gray-600 text-sm">
              Your privacy is our priority. We separate what's private from what's public.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
            {/* Private Side */}
            <div className="flex-1 max-w-xs">
              <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl p-5 border-2 border-slate-200 text-center">
                <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-display text-lg font-semibold text-slate-800 mb-1">Legal Name</h3>
                <p className="text-xs text-slate-600 mb-2">Private / NPO Only</p>
                <div className="flex flex-wrap justify-center gap-1">
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">Contracts</span>
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">Guardian Info</span>
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">COPPA Records</span>
                </div>
              </div>
            </div>
            
            {/* Arrow Separator */}
            <div className="flex items-center justify-center">
              <div className="hidden md:flex items-center">
                <div className="w-8 h-0.5 bg-teal-400"></div>
                <Shield className="w-8 h-8 text-teal-500 mx-2" />
                <div className="w-8 h-0.5 bg-teal-400"></div>
              </div>
              <div className="md:hidden flex flex-col items-center py-2">
                <div className="h-4 w-0.5 bg-teal-400"></div>
                <Shield className="w-6 h-6 text-teal-500 my-1" />
                <div className="h-4 w-0.5 bg-teal-400"></div>
              </div>
            </div>
            
            {/* Public Side */}
            <div className="flex-1 max-w-xs">
              <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-5 border-2 border-teal-200 text-center">
                <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-display text-lg font-semibold text-slate-800 mb-1">Pseudonym</h3>
                <p className="text-xs text-teal-700 mb-2">Public / LLC Publishing</p>
                <div className="flex flex-wrap justify-center gap-1">
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">Book Credits</span>
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">Author Profile</span>
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">Marketing</span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-center text-xs text-gray-500 mt-4">
            Zero-PII Architecture: For minor authors, legal names never leave the NPO. Only pseudonyms are shared publicly.
          </p>
        </div>
      </section>

      {/* SECTION 3: Our Current Work */}
      <section className="py-14 bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
              Our Current Work
            </h2>
            <p className="text-lg text-teal-600 font-medium mb-1">
              Project: Frictionless Literacy (Adult Authorship Path)
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-10">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center md:text-left">
                <h3 className="font-display text-lg font-semibold text-slate-800 mb-3">The Mission</h3>
                <p className="text-gray-600 leading-relaxed">
                  We provide a path for all children and adults silenced by discrimination and lack of privilege 
                  to speak their minds, protect their history, and build a published legacy that belongs to them.
                </p>
              </div>
              
              <div className="text-center md:text-left">
                <h3 className="font-display text-lg font-semibold text-slate-800 mb-3">The Literacy Point</h3>
                <p className="text-gray-600 leading-relaxed">
                  We teach the active craft of writing as a foundational key to literacy. By learning to author 
                  their own stories, our participants gain the tools to decode and understand the world around them more fluently.
                </p>
              </div>
              
              <div className="text-center md:text-left">
                <h3 className="font-display text-lg font-semibold text-slate-800 mb-3">Our Impact Goal</h3>
                <p className="text-gray-600 leading-relaxed">
                  We are currently focused on serving <span className="font-bold text-teal-600">20 individuals</span>, 
                  with a deep commitment to bridging the literacy gap for Black and Hispanic learners.
                </p>
              </div>
            </div>
          </div>

          {/* NLD Images Section */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-100">
              <img 
                src="/images/technology-tool.jpg" 
                alt="We use computers and tablets to help you write your book. Our tools make it easy for everyone to become an author."
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h4 className="font-display font-semibold text-slate-800 mb-2">The Technology Tool</h4>
                <p className="text-gray-600 text-sm">
                  We use computers and tablets to help you write your book. Our tools make it easy for everyone to become an author.
                </p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-100">
              <img 
                src="/images/learning-path.jpg" 
                alt="You can work with a teacher or a volunteer to tell your story. We provide free help for all adults and children in our community."
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h4 className="font-display font-semibold text-slate-800 mb-2">The Learning Path</h4>
                <p className="text-gray-600 text-sm">
                  You can work with a teacher or a volunteer to tell your story. We provide free help for all adults and children in our community.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Publishing Journey (Flywheel) */}
      <section className="py-14 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
              The Publishing Journey
            </h2>
            <p className="text-gray-600 text-sm">
              Your seven-step path from idea to published author
            </p>
          </div>
          
          {/* Professional Flywheel - Desktop */}
          <div className="hidden md:block">
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-teal-200 via-teal-400 to-teal-600 rounded-full"></div>
              
              {/* Phases */}
              <div className="relative flex justify-between">
                {PUBLISHING_PHASES.map((phase) => (
                  <div key={phase.id} className="flex flex-col items-center group">
                    <div className="w-16 h-16 bg-white rounded-full shadow-lg border-4 border-teal-400 flex items-center justify-center mb-3 z-10 group-hover:border-teal-600 group-hover:scale-110 transition-all">
                      <span className="font-display text-xl font-bold text-teal-600">{phase.id}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">{phase.label}</span>
                    <span className="text-xs text-gray-500 text-center max-w-[100px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {phase.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Mobile Flywheel - Vertical */}
          <div className="md:hidden">
            <div className="relative pl-8">
              {/* Vertical Line */}
              <div className="absolute left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-200 via-teal-400 to-teal-600 rounded-full"></div>
              
              <div className="space-y-6">
                {PUBLISHING_PHASES.map((phase) => (
                  <div key={phase.id} className="flex items-start">
                    <div className="w-10 h-10 bg-white rounded-full shadow-md border-3 border-teal-400 flex items-center justify-center -ml-5 z-10 flex-shrink-0">
                      <span className="font-display text-sm font-bold text-teal-600">{phase.id}</span>
                    </div>
                    <div className="ml-4">
                      <span className="font-semibold text-slate-800">{phase.label}</span>
                      <p className="text-xs text-gray-500">{phase.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <p className="text-center text-sm text-gray-500 mt-10">
            Momentum is our goal — we move forward together.
          </p>
        </div>
      </section>

      {/* SECTION 4: Impact Analytics */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
              Impact Analytics
            </h2>
            <p className="text-gray-600 text-sm">
              Real-time metrics demonstrating our commitment to emerging authors
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Founded January 1, 2026
            </p>
          </div>

          {metricsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-400"></div>
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 text-center border border-green-100">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-slate-800 mb-0.5">{metrics.identityProtectionRate}%</p>
                <p className="text-gray-600 font-medium text-xs">Identity Protection</p>
                <p className="text-[10px] text-gray-500 mt-0.5">COPPA Compliant</p>
              </div>

              <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-4 text-center border border-teal-100">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Users className="w-5 h-5 text-teal-600" />
                </div>
                <p className="text-2xl font-bold text-slate-800 mb-0.5">{metrics.youthAuthorsSupported}/{metrics.totalAuthorsSupported}</p>
                <p className="text-gray-600 font-medium text-xs">Authors Supported</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Youth / Total</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 text-center border border-blue-100">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-slate-800 mb-0.5">{metrics.activeCohortSize}/10</p>
                <p className="text-gray-600 font-medium text-xs">Active Cohort</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Current Progress</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 text-center border border-purple-100">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-slate-800 mb-0.5">{metrics.publishedBooks}</p>
                <p className="text-gray-600 font-medium text-xs">Books Published</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Available Now</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              Unable to load impact metrics
            </div>
          )}
        </div>
      </section>

      {/* SECTION 6: Partners & Affiliations */}
      <section className="py-10 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="font-display text-xl font-bold text-slate-800 mb-1">
              Partners & Affiliations
            </h2>
            <p className="text-gray-600 text-sm">
              Proud members of literacy advocacy networks
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-8">
            {/* ProLiteracy Badge Placeholder */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex flex-col items-center min-w-[160px]">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center mb-3 border-2 border-dashed border-blue-300">
                <Handshake className="w-10 h-10 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-slate-700">ProLiteracy</span>
              <span className="text-xs text-gray-500">Partner Member</span>
            </div>
            
            {/* National Literacy Directory */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex flex-col items-center min-w-[160px]">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-50 rounded-lg flex items-center justify-center mb-3 border border-green-300">
                <BookOpen className="w-10 h-10 text-green-500" />
              </div>
              <span className="text-sm font-medium text-slate-700">NLD ID: 131274</span>
              <span className="text-xs text-gray-500">National Literacy Directory</span>
            </div>
          </div>
          
          <p className="text-center text-xs text-gray-500 mt-6">
            Badge images will be added upon membership confirmation
          </p>
        </div>
      </section>

      {/* SECTION 7: Unified CTA Footer */}
      <section className="py-14 bg-gradient-to-br from-teal-500 to-blue-600 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-bold mb-3">
            Ready to Share Your Story?
          </h2>
          <p className="text-teal-100 mb-6 text-lg leading-relaxed">
            Join our community of emerging authors and take the first step toward publication.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              href="/register" 
              className="bg-white text-teal-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors inline-flex items-center justify-center space-x-2"
            >
              <span>Apply to Write</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              href="/donations" 
              className="border-2 border-white text-white hover:bg-white/10 font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Support Our Authors
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <img src="/logo.png" alt="The Indie Quill Collective" className="w-10 h-10 rounded-full" />
              <div>
                <h3 className="font-display text-base font-bold text-white">The Indie Quill Collective</h3>
                <p className="text-xs text-red-400">501(c)(3) Non-Profit Organization</p>
              </div>
            </div>
            <p className="text-xs">
              &copy; {new Date().getFullYear()} The Indie Quill Collective. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
