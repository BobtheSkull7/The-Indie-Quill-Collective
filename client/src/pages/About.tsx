import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Heart, Users, Shield, TrendingUp, BookOpen, ArrowRight } from "lucide-react";

interface ImpactMetrics {
  totalAuthorsSupported: number;
  identityProtectionRate: number;
  activeCohortSize: number;
  signedContracts: number;
  publishedBooks: number;
  youthAuthorsSupported: number;
  lastUpdated: string;
}

export default function About() {
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/impact")
      .then((res) => res.json())
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white py-20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
        
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Heart className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium">501(c)(3) Non-Profit Organization</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
              About The Indie Quill Collective
            </h1>
            
            <p className="text-xl text-slate-200 max-w-3xl mx-auto leading-relaxed">
              We bridge the gap between creative talent and the publishing industry, 
              providing emerging authors with the resources, mentorship, and pathways 
              they need to share their stories with the world.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-slate-800 mb-4">
              Impact Analytics
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Real-time metrics demonstrating our commitment to supporting emerging authors 
              while maintaining the highest standards of privacy and protection.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 text-center border border-green-100">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800 mb-1">{metrics.identityProtectionRate}%</p>
                <p className="text-gray-600 font-medium text-sm">Identity Protection</p>
                <p className="text-xs text-gray-500 mt-1">COPPA Compliant</p>
              </div>

              <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-6 text-center border border-teal-100">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-teal-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800 mb-1">{metrics.youthAuthorsSupported}/{metrics.totalAuthorsSupported}</p>
                <p className="text-gray-600 font-medium text-sm">Authors Supported</p>
                <p className="text-xs text-gray-500 mt-1">Youth / Total</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 text-center border border-blue-100">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800 mb-1">{metrics.activeCohortSize}/10</p>
                <p className="text-gray-600 font-medium text-sm">Active Cohort</p>
                <p className="text-xs text-gray-500 mt-1">Current Progress</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 text-center border border-purple-100">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800 mb-1">{metrics.publishedBooks}</p>
                <p className="text-gray-600 font-medium text-sm">Books Published</p>
                <p className="text-xs text-gray-500 mt-1">Available Now</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Unable to load impact metrics
            </div>
          )}

          {metrics?.lastUpdated && (
            <p className="text-center text-xs text-gray-400 mt-6">
              Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl font-bold text-slate-800 mb-6">
                Our Mission
              </h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                The Indie Quill Collective exists to democratize publishing. We believe that 
                every story deserves to be told, regardless of the author's age, background, 
                or financial situation.
              </p>
              <p className="text-gray-600 mb-4 leading-relaxed">
                As a 501(c)(3) non-profit, we provide free professional publishing services, 
                mentorship, and guidance to emerging authors. Our partnership with The Indie 
                Quill LLC ensures that once an author is ready, they have a clear pathway 
                to professional publication and distribution.
              </p>
              <p className="text-gray-600 leading-relaxed">
                We take privacy seriously. Our Zero-PII architecture ensures that author 
                identities are protected throughout the publishing journey, with special 
                safeguards for young authors under COPPA guidelines.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <h3 className="font-display text-xl font-semibold text-slate-800 mb-6">
                The Author Journey
              </h3>
              <div className="space-y-4">
                {[
                  { step: 1, title: "Apply", desc: "Submit your application with pseudonym and identity preferences" },
                  { step: 2, title: "Review", desc: "Our team evaluates your application within 72 hours" },
                  { step: 3, title: "Contract", desc: "Sign your publishing agreement with forensic-grade security" },
                  { step: 4, title: "Publish", desc: "Work with mentors through the 7-phase Literacy Logistics Framework" },
                ].map((item) => (
                  <div key={item.step} className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-teal-600">{item.step}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-teal-500 to-blue-600 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-6 opacity-90" />
          <h2 className="font-display text-3xl font-bold mb-4">
            Support Our Mission
          </h2>
          <p className="text-teal-100 mb-8 text-lg leading-relaxed">
            Your donation helps us provide free publishing services, mentorship, and 
            resources to emerging authors. Every contribution makes a difference.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="bg-white text-teal-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors inline-flex items-center justify-center space-x-2">
              <span>Become an Author</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a 
              href="mailto:Jon@theindiequill.com?subject=Donation Inquiry" 
              className="border-2 border-white text-white hover:bg-white/10 font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Contact for Donations
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
