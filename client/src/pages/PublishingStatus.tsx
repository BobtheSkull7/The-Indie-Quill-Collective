import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import { 
  BookOpen, FileText, Edit3, Palette, Layout, 
  CheckCircle, Clock, Rocket, ArrowRight 
} from "lucide-react";

interface PublishingUpdate {
  id: number;
  applicationId: number;
  indieQuillAuthorId: string | null;
  status: string;
  statusMessage: string | null;
  estimatedCompletion: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusSteps = [
  { key: "not_started", label: "Getting Started", icon: Clock },
  { key: "manuscript_received", label: "Manuscript Received", icon: FileText },
  { key: "editing", label: "Professional Editing", icon: Edit3 },
  { key: "cover_design", label: "Cover Design", icon: Palette },
  { key: "formatting", label: "Book Formatting", icon: Layout },
  { key: "review", label: "Final Review", icon: CheckCircle },
  { key: "published", label: "Published", icon: Rocket },
];

export default function PublishingStatus() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [updates, setUpdates] = useState<PublishingUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }

    fetch("/api/publishing-updates")
      .then((res) => res.json())
      .then(setUpdates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, setLocation]);

  const getStepIndex = (status: string) => {
    return statusSteps.findIndex((s) => s.key === status);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-800">Publishing Status</h1>
          <p className="text-gray-600 mt-1">Track your book's journey to publication</p>
        </div>

        {updates.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-slate-800 mb-3">
              No Publishing Updates Yet
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Once your application is accepted and contract signed, you'll be able to 
              track your book's publishing progress here.
            </p>
            <a href="/dashboard" className="btn-secondary inline-flex items-center space-x-2">
              <span>View Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {updates.map((update) => {
              const currentStepIndex = getStepIndex(update.status);

              return (
                <div key={update.id} className="card">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="font-display text-xl font-semibold text-slate-800">
                        Your Publishing Journey
                      </h2>
                      {update.indieQuillAuthorId && (
                        <p className="text-sm text-gray-500 mt-1">
                          Author ID: {update.indieQuillAuthorId}
                        </p>
                      )}
                    </div>
                    {update.estimatedCompletion && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Estimated Completion</p>
                        <p className="font-medium text-slate-800">{update.estimatedCompletion}</p>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    
                    <div className="space-y-6">
                      {statusSteps.map((step, index) => {
                        const StepIcon = step.icon;
                        const isCompleted = index < currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        const isPending = index > currentStepIndex;

                        return (
                          <div key={step.key} className="relative flex items-start space-x-4">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                                isCompleted
                                  ? "bg-green-500"
                                  : isCurrent
                                  ? "bg-teal-400"
                                  : "bg-gray-200"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle className="w-6 h-6 text-white" />
                              ) : (
                                <StepIcon className={`w-6 h-6 ${isCurrent ? "text-white" : "text-gray-400"}`} />
                              )}
                            </div>
                            
                            <div className={`pt-2 ${isPending ? "opacity-50" : ""}`}>
                              <h3 className={`font-medium ${isCurrent ? "text-teal-500" : "text-slate-800"}`}>
                                {step.label}
                                {isCurrent && (
                                  <span className="ml-2 text-xs bg-teal-400 text-white px-2 py-0.5 rounded-full">
                                    Current
                                  </span>
                                )}
                              </h3>
                              {isCurrent && update.statusMessage && (
                                <p className="text-sm text-gray-600 mt-1">{update.statusMessage}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {update.lastSyncedAt && (
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Last updated: {new Date(update.lastSyncedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 card bg-gradient-to-br from-blue-50 to-teal-50 border-teal-200">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-teal-400 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-800">
                About The Indie Quill Partnership
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                The Indie Quill Collective partners with The Indie Quill LLC for professional publishing services. 
                Once accepted, your manuscript goes through our comprehensive publishing pipeline, 
                including professional editing, custom cover design, and multi-platform distribution.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
