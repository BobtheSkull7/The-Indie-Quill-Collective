import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Heart, ArrowRight, Shield, Lock, Globe, Users, TrendingUp, BookOpen, ChevronRight } from "lucide-react";

interface ImpactMetrics {
  totalAuthorsSupported: number;
  identityProtectionRate: number;
  activeCohortSize: number;
  signedContracts: number;
  publishedBooks: number;
  youthAuthorsSupported: number;
  lastUpdated: string;
}

const CHEVRON_PHASES = [
  { id: 1, label: "Agreement", icon: "✍️" },
  { id: 2, label: "Creation", icon: "📝" },
  { id: 3, label: "Editing", icon: "📖" },
  { id: 4, label: "Review", icon: "🔍" },
  { id: 5, label: "Modifications", icon: "✏️" },
  { id: 6, label: "Published", icon: "📚" },
  { id: 7, label: "Marketing", icon: "🎉" },
];

export default function Home() {
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/impact")
      .then((res) => res.json())
      .then(setMetrics)
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
            Zero-PII Architecture: Legal names never leave the NPO. Only pseudonyms are shared publicly.
          </p>
        </div>
      </section>

      {/* SECTION 3: Chevron Path (Flywheel) */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
              The Chevron Path
            </h2>
            <p className="text-gray-600 text-sm">
              Your 7-phase journey from manuscript to published author
            </p>
          </div>
          
          {/* Horizontal Flywheel - Desktop */}
          <div className="hidden md:block">
            <div className="flex items-center justify-center gap-2">
              {CHEVRON_PHASES.map((phase, index) => (
                <div key={phase.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-white rounded-xl shadow-md border-2 border-gray-200 flex items-center justify-center mb-2 hover:shadow-lg hover:border-teal-400 transition-all">
                      <span className="text-2xl">{phase.icon}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-700 text-center w-20">{phase.label}</span>
                  </div>
                  {index < CHEVRON_PHASES.length - 1 && (
                    <div className="mx-3 flex-shrink-0">
                      <ChevronRight className="w-6 h-6 text-teal-500" strokeWidth={3} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Mobile Flywheel - Compact Grid */}
          <div className="md:hidden">
            <div className="grid grid-cols-4 gap-3">
              {CHEVRON_PHASES.slice(0, 4).map((phase) => (
                <div key={phase.id} className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-white rounded-xl shadow-md border-2 border-gray-200 flex items-center justify-center mb-2">
                    <span className="text-xl">{phase.icon}</span>
                  </div>
                  <span className="text-xs font-medium text-slate-700 text-center">{phase.label}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center my-3">
              <ChevronRight className="w-6 h-6 text-teal-500 rotate-90" strokeWidth={3} />
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
              {CHEVRON_PHASES.slice(4).map((phase) => (
                <div key={phase.id} className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-white rounded-xl shadow-md border-2 border-gray-200 flex items-center justify-center mb-2">
                    <span className="text-xl">{phase.icon}</span>
                  </div>
                  <span className="text-xs font-medium text-slate-700 text-center">{phase.label}</span>
                </div>
              ))}
            </div>
          </div>
          
          <p className="text-center text-sm text-gray-500 mt-8">
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

      {/* SECTION 5: Unified CTA Footer */}
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
