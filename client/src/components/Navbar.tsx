import { Link, useLocation } from "wouter";
import { useAuth } from "../App";
import { Menu, X, User, LogOut } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, setUser } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <img src="/logo.png" alt="The Indie Quill Collective" className="w-12 h-12 rounded-full" />
              <div className="hidden sm:block">
                <h1 className="font-display text-xl font-bold text-slate-800">The Indie Quill</h1>
                <p className="text-xs text-red-500 font-medium -mt-1">COLLECTIVE</p>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className={`text-sm font-medium transition-colors ${location === "/" ? "text-red-500" : "text-gray-600 hover:text-slate-800"}`}
            >
              Home
            </Link>
            
            {!user ? (
              <>
                <Link 
                  href="/apply" 
                  className={`text-sm font-medium transition-colors ${location === "/apply" ? "text-red-500" : "text-gray-600 hover:text-slate-800"}`}
                >
                  Apply
                </Link>
                <Link href="/login" className="btn-secondary text-sm py-2 px-4">
                  Sign In
                </Link>
                <Link href="/register" className="btn-primary text-sm py-2 px-4">
                  Join Us
                </Link>
              </>
            ) : (
              <>
                <Link 
                  href="/dashboard" 
                  className={`text-sm font-medium transition-colors ${location === "/dashboard" ? "text-red-500" : "text-gray-600 hover:text-slate-800"}`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/contracts" 
                  className={`text-sm font-medium transition-colors ${location === "/contracts" ? "text-red-500" : "text-gray-600 hover:text-slate-800"}`}
                >
                  Contracts
                </Link>
                <Link 
                  href="/publishing-status" 
                  className={`text-sm font-medium transition-colors ${location === "/publishing-status" ? "text-red-500" : "text-gray-600 hover:text-slate-800"}`}
                >
                  Publishing Status
                </Link>
                {user.role === "admin" && (
                  <Link 
                    href="/admin" 
                    className={`text-sm font-medium transition-colors ${location === "/admin" ? "text-red-500" : "text-gray-600 hover:text-slate-800"}`}
                  >
                    Admin
                  </Link>
                )}
                <div className="flex items-center space-x-3 border-l pl-6 border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-red-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{user.firstName}</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-4 px-4 space-y-3">
          <Link href="/" className="block text-gray-600 hover:text-slate-800 py-2">Home</Link>
          {!user ? (
            <>
              <Link href="/apply" className="block text-gray-600 hover:text-slate-800 py-2">Apply</Link>
              <Link href="/login" className="block text-gray-600 hover:text-slate-800 py-2">Sign In</Link>
              <Link href="/register" className="block btn-primary text-center">Join Us</Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" className="block text-gray-600 hover:text-slate-800 py-2">Dashboard</Link>
              <Link href="/contracts" className="block text-gray-600 hover:text-slate-800 py-2">Contracts</Link>
              <Link href="/publishing-status" className="block text-gray-600 hover:text-slate-800 py-2">Publishing Status</Link>
              {user.role === "admin" && (
                <Link href="/admin" className="block text-gray-600 hover:text-slate-800 py-2">Admin</Link>
              )}
              <button onClick={handleLogout} className="block w-full text-left text-red-500 py-2">Logout</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
