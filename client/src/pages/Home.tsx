import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Heart, ArrowRight, Shield, BookOpen, Users, Handshake } from "lucide-react";

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
      {/* SECTION 1: Hero */}
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

      {/* Slim Impact Metrics Bar */}
      <div className="bg-white border-y border-gray-100">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex divide-x divide-gray-100">
            {[
              {
                value: metricsLoading ? "—" : `${metrics?.identityProtectionRate ?? "—"}%`,
                label: "Identity Protection",
                icon: Shield,
                iconClass: "text-green-500",
              },
              {
                value: metricsLoading ? "—" : (metrics?.totalAuthorsSupported ?? "—"),
                label: "Authors Supported",
                icon: Users,
                iconClass: "text-teal-500",
              },
              {
                value: metricsLoading
                  ? "—"
                  : metrics && metrics.publishedBooks > 0
                  ? metrics.publishedBooks
                  : "Launching Soon",
                label: "Books Published",
                icon: BookOpen,
                iconClass: "text-purple-500",
              },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="flex-1 flex items-center justify-center gap-2.5 py-4 px-3">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${m.iconClass}`} />
                  <span className="font-bold text-slate-800 text-sm">{m.value}</span>
                  <span className="text-gray-500 text-xs hidden sm:inline">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION: Publishing Journey (Flywheel) */}
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
              <div className="absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-teal-200 via-teal-400 to-teal-600 rounded-full"></div>
              
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

      {/* SECTION: Partners & Affiliations */}
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
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex flex-col items-center min-w-[160px]">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center mb-3 border-2 border-dashed border-blue-300">
                <Handshake className="w-10 h-10 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-slate-700">ProLiteracy</span>
              <span className="text-xs text-gray-500">Partner Member</span>
            </div>
            
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

      {/* SECTION: Unified CTA Footer */}
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
      <footer className="bg-slate-900 text-slate-300 py-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="The Indie Quill Collective" className="w-10 h-10 rounded-full" />
              <div>
                <h3 className="font-display text-base font-bold text-white">The Indie Quill Collective</h3>
                <p className="text-xs text-red-400">501(c)(3) Non-Profit Organization</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <a
                href="mailto:jon@theindiequill.com"
                className="flex items-center gap-2 text-sm text-slate-300 hover:text-teal-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                jon@theindiequill.com
              </a>
              <a
                href="tel:+18179132154"
                className="flex items-center gap-2 text-sm text-slate-300 hover:text-teal-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                (817) 913-2154
              </a>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <a href="/privacy" className="text-xs text-slate-400 hover:text-teal-400 transition-colors">Privacy Policy</a>
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} The Indie Quill Collective. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
