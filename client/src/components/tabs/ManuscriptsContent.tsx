import { useState, useEffect } from "react";
import { FileText, BookOpen, Clock, CheckCircle, Send, AlertCircle } from "lucide-react";

interface Manuscript {
  userId: string;
  authorName: string;
  pseudonym: string;
  wordCount: number;
  isPublished: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

export default function ManuscriptsContent() {
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadManuscripts();
  }, []);

  const loadManuscripts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/manuscripts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch manuscripts");
      const data = await res.json();
      setManuscripts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading manuscripts:", err);
      setError("Failed to load manuscript data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const totalWords = manuscripts.reduce((sum, m) => sum + (Number(m.wordCount) || 0), 0);
  const published = manuscripts.filter(m => m.isPublished).length;
  const readyForReview = manuscripts.filter(m => !m.isPublished && (Number(m.wordCount) || 0) >= 500).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <BookOpen className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-slate-800">Manuscript Library</h2>
          </div>
          <p className="text-gray-600 text-sm">All student manuscripts on file</p>
        </div>
        <button
          onClick={loadManuscripts}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <FileText className="w-4 h-4" />
            Total Authors
          </div>
          <p className="text-2xl font-bold text-slate-800">{manuscripts.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <BookOpen className="w-4 h-4" />
            Total Words
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalWords.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Published
          </div>
          <p className="text-2xl font-bold text-green-600">{published}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Send className="w-4 h-4 text-blue-500" />
            Ready for Review
          </div>
          <p className="text-2xl font-bold text-blue-600">{readyForReview}</p>
        </div>
      </div>

      {manuscripts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Manuscripts Yet</h3>
          <p className="text-gray-500">Manuscripts appear when students write using the Scribe's Sanctum.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {manuscripts.map((manuscript, idx) => {
            const wc = Number(manuscript.wordCount) || 0;
            const isReady = !manuscript.isPublished && wc >= 500;
            return (
              <div key={manuscript.userId || idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className={`h-2 ${manuscript.isPublished ? "bg-green-500" : isReady ? "bg-blue-500" : "bg-gray-300"}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">{manuscript.pseudonym || manuscript.authorName}</h3>
                      <p className="text-sm text-gray-500">{manuscript.authorName}</p>
                    </div>
                    {manuscript.isPublished ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Published
                      </span>
                    ) : isReady ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        <Send className="w-3 h-3" />
                        Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                        <AlertCircle className="w-3 h-3" />
                        Drafting
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-lg font-bold text-slate-800">{wc.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Words</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-lg font-bold text-slate-800">{Math.ceil(wc / 250)}</p>
                      <p className="text-xs text-gray-500">Pages (est.)</p>
                    </div>
                  </div>

                  {manuscript.updatedAt && (
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Updated {new Date(manuscript.updatedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-purple-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-purple-900">Publication Threshold</h4>
            <p className="text-sm text-purple-800 mt-1">
              Manuscripts with 500+ words can be submitted for review using "One-Click Publish" in the Drafting Suite.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
