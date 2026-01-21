import { Link } from "wouter";
import { Heart, Clock, ArrowLeft } from "lucide-react";

export default function Donations() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 flex items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-8">
          <Heart className="w-10 h-10 text-red-400" />
        </div>
        
        <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
          Donations
        </h1>
        
        <div className="inline-flex items-center space-x-2 bg-amber-500/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-amber-200 font-medium">Coming Soon</span>
        </div>
        
        <p className="text-slate-300 text-lg leading-relaxed mb-8">
          We're building a seamless way for you to support emerging authors. 
          Our donation platform will be available shortly.
        </p>
        
        <p className="text-slate-400 text-sm mb-8">
          In the meantime, please reach out directly at{" "}
          <a 
            href="mailto:Jon@theindiequill.com?subject=Donation Inquiry" 
            className="text-teal-400 hover:text-teal-300 underline"
          >
            Jon@theindiequill.com
          </a>
        </p>
        
        <Link 
          href="/about" 
          className="inline-flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to About</span>
        </Link>
      </div>
    </div>
  );
}
