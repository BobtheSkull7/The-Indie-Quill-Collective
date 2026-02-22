import { useState, useEffect } from "react";
import { Shield, AlertTriangle, CheckCircle, Clock, Clipboard, User, FileText, RefreshCw } from "lucide-react";

interface Submission {
  id: number;
  user_id: string;
  card_id: number;
  manuscript_id: number | null;
  reflection: string;
  xp_earned: number;
  status: string;
  paste_count: number;
  is_flagged_for_review: boolean;
  submitted_at: string;
  card_task: string;
  deck_title: string;
  author_name: string | null;
}

export default function SubmissionsPanel() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const url = flaggedOnly ? "/api/admin/submissions?flagged=true" : "/api/admin/submissions";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (err) {
      console.error("Error fetching submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [flaggedOnly]);

  const flaggedCount = submissions.filter(s => s.is_flagged_for_review).length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-800">
              Submission Integrity Review
            </h2>
            <p className="text-sm text-gray-500">
              {submissions.length} total submissions{flaggedCount > 0 && ` · ${flaggedCount} flagged`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={flaggedOnly}
              onChange={(e) => setFlaggedOnly(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-gray-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Flagged only
            </span>
          </label>
          <button
            onClick={fetchSubmissions}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>{flaggedOnly ? "No flagged submissions" : "No submissions yet"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className={`p-4 rounded-lg border ${
                sub.is_flagged_for_review
                  ? "border-amber-200 bg-amber-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {sub.is_flagged_for_review && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        Flagged
                      </span>
                    )}
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {sub.card_task}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {sub.author_name || `User ${sub.user_id}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {sub.deck_title}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(sub.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5">
                      <Clipboard className="w-3.5 h-3.5 text-gray-400" />
                      <span className={`text-sm font-medium ${
                        sub.paste_count > 0
                          ? sub.is_flagged_for_review ? "text-amber-700" : "text-gray-700"
                          : "text-green-600"
                      }`}>
                        {sub.paste_count > 0 ? `${sub.paste_count} chars pasted` : "Original"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      +{sub.xp_earned} XP
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    sub.is_flagged_for_review
                      ? "bg-amber-100"
                      : "bg-green-100"
                  }`}>
                    {sub.is_flagged_for_review ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
