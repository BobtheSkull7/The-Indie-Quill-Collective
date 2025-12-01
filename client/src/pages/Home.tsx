import { Link } from "wouter";
import { Heart, ArrowRight, Sparkles, Shield, Rocket } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Heart className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium">501(c)(3) Non-Profit Organization</span>
            </div>
            
            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight">
              The Indie Quill
              <span className="block text-red-500">Collective</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-200 mb-8 leading-relaxed">
              Empowering emerging authors of all ages to share their stories with the world. 
              We provide mentorship, resources, and a path to professional publishing.
            </p>
            
            <div className="flex justify-center">
              <Link href="/register" className="btn-primary flex items-center justify-center space-x-2">
                <span>Start Your Journey</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-slate-800 mb-4">
              Why Join The Collective?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We believe every voice deserves to be heard. Our mission is to remove barriers 
              and create opportunities for aspiring authors.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center group hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-display text-2xl font-semibold text-slate-800 mb-3">Publishing Tools</h3>
              <p className="text-gray-600">
                Professional editing, cover design, and formatting tools at no cost. 
                We invest in your success.
              </p>
            </div>
            
            <div className="card text-center group hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-display text-2xl font-semibold text-slate-800 mb-3">Safe for Young Authors</h3>
              <p className="text-gray-600">
                Special support for minor authors with guardian-approved contracts and 
                age-appropriate guidance.
              </p>
            </div>
            
            <div className="card text-center group hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-display text-2xl font-semibold text-slate-800 mb-3">Path to Publication</h3>
              <p className="text-gray-600">
                Seamless transition to The Indie Quill LLC for professional publishing 
                and distribution.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-slate-800 mb-4">
              How It Works
            </h2>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: 1, title: "Apply", desc: "Fill out our simple application with your book details" },
              { step: 2, title: "Review", desc: "Our team reviews your application with care" },
              { step: 3, title: "Contract", desc: "Sign your publishing agreement (guardians for minors)" },
              { step: 4, title: "Publish", desc: "We handle everything to bring your book to life" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="font-display text-xl font-semibold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <img src="/logo.png" alt="The Indie Quill Collective" className="w-20 h-20 mx-auto mb-6 rounded-full" />
          <h2 className="font-display text-4xl font-bold mb-6">
            Ready to Share Your Story?
          </h2>
          <p className="text-xl text-slate-200 mb-8">
            Join our community of emerging authors and take the first step toward 
            seeing your book in print.
          </p>
          <Link href="/register" className="btn-primary inline-flex items-center space-x-2">
            <span>Apply Now</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <img src="/logo.png" alt="The Indie Quill Collective" className="w-12 h-12 rounded-full" />
              <div>
                <h3 className="font-display text-lg font-bold text-white">The Indie Quill Collective</h3>
                <p className="text-xs text-red-400">501(c)(3) Non-Profit Organization</p>
              </div>
            </div>
            <p className="text-sm">
              &copy; {new Date().getFullYear()} The Indie Quill Collective. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
