import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import { 
  BookOpen, FileText, Edit3, Layout, 
  CheckCircle, Clock, Rocket, ArrowRight, Megaphone, PenTool
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
  { key: "agreement", label: "Agreement", icon: FileText, description: "You and your guardian will sign your publishing agreement." },
  { key: "creation", label: "Creation", icon: PenTool, description: "We mentor you through your writing journey with helpful tools for formatting, book cover, and page insertions." },
  { key: "editing", label: "Editing", icon: Edit3, description: "We edit your manuscript and set up your professional ISBN and Copyright filing." },
  { key: "review", label: "Review", icon: CheckCircle, description: "We provide a thorough review and suggest genres or specific changes." },
  { key: "modifications", label: "Modifications", icon: Layout, description: "The writer performs changes to finalize the book (can repeat as needed)." },
  { key: "published", label: "Published", icon: Rocket, description: "Your book goes live in the Bookstore!" },
  { key: "marketing", label: "Marketing", icon: Megaphone, description: "We provide the launch day party and free marketing to kickstart your success." },
];

const legacyToNewStageMap: Record<string, string> = {
  'not_started': 'agreement',
  'manuscript_received': 'creation',
  'cover_design': 'editing',
  'formatting': 'editing',
};

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
      .then((data) => setUpdates(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, setLocation]);

  const getStepIndex = (status: string) => {
    return statusSteps.findIndex((s) => s.key === status);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8 px-4 bg-gray-50">
        <div className="card max-w-md text-center">
          <h2 className="font-display text-xl font-bold text-slate-800 mb-2">Please Sign In</h2>
          <p className="text-gray-600 mb-4">You need to be logged in to view your publishing status.</p>
          <a href="/login" className="btn-primary">
            Sign In
          </a>
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
