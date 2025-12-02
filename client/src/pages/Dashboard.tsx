import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../App";
import { FileText, Clock, CheckCircle, XCircle, ArrowRight, BookOpen, AlertCircle } from "lucide-react";

interface Application {
  id: number;
  bookTitle: string;
  genre: string;
  status: string;
  createdAt: string;
  reviewNotes: string | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }

    fetch("/api/applications")
      .then((res) => res.json())
      .then(setApplications)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, setLocation]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock },
      under_review: { bg: "bg-blue-100", text: "text-blue-700", icon: FileText },
      accepted: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
      rejected: { bg: "bg-red-100", text: "text-red-700", icon: XCircle },
      migrated: { bg: "bg-purple-100", text: "text-purple-700", icon: BookOpen },
    };

    const style = styles[status] || styles.pending;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-4 h-4" />
        <span className="capitalize">{status.replace("_", " ")}</span>
      </span>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8 px-4 bg-gray-50">
        <div className="card max-w-md text-center">
          <h2 className="font-display text-xl font-bold text-slate-800 mb-2">Please Sign In</h2>
          <p className="text-gray-600 mb-4">You need to be logged in to view your dashboard.</p>
          <Link href="/login" className="btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-800">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-gray-600 mt-1">Track your applications and publishing journey</p>
          </div>
          <Link href="/apply" className="mt-4 md:mt-0 btn-primary inline-flex items-center space-x-2">
            <span>New Application</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {applications.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-slate-800 mb-3">
              No Applications Yet
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Ready to share your story with the world? Start your publishing journey 
              by submitting your first application.
            </p>
            <Link href="/apply" className="btn-primary inline-flex items-center space-x-2">
              <span>Apply Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-slate-800">Your Applications</h2>
            
            {applications.map((app) => (
              <div key={app.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <h3 className="font-display text-xl font-semibold text-slate-800 mb-1">
                      {app.bookTitle}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">{app.genre}</p>
                    <div className="flex items-center space-x-4">
                      {getStatusBadge(app.status)}
                      <span className="text-sm text-gray-500">
                        Submitted {new Date(app.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {app.status === "accepted" && (
                    <Link 
                      href="/contracts" 
                      className="mt-4 md:mt-0 btn-primary text-sm py-2 px-4 inline-flex items-center space-x-2"
                    >
                      <span>View Contract</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>

                {app.reviewNotes && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">Review Notes</p>
                        <p className="text-sm text-gray-600 mt-1">{app.reviewNotes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
