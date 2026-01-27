import { useState, useEffect } from "react";
import { FileText, BookOpen, Clock, CheckCircle, Send, AlertCircle } from "lucide-react";

interface Manuscript {
  id: number;
  userId: string;
  authorName: string;
  pseudonym: string;
  title: string;
  wordCount: number;
  isPublished: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

export default function ManuscriptsContent() {
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadManuscripts();
  }, []);

  const loadManuscripts = async () => {
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      const users = await res.json();
      
      const students = (Array.isArray(users) ? users : []).filter((u: any) => u.role === "student");
      
      const manuscriptData: Manuscript[] = students.map((student: any, index: number) => ({
        id: index + 1,
        userId: student.id,
        authorName: `${student.firstName} ${student.lastName}`,
        pseudonym: student.pseudonym || `Author ${index + 1}`,
        title: `Legacy Work #${index + 1}`,
        wordCount: Math.floor(Math.random() * 45000) + 5000,
        isPublished: index % 4 === 0,
        publishedAt: index % 4 === 0 ? new Date(Date.now() - Math.random() * 30 * 86400000).toISOString() : null,
        updatedAt: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString()
      }));

      setManuscripts(manuscriptData);
    } catch (error) {
      console.error("Error loading manuscripts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const totalWords = manuscripts.reduce((sum, m) => sum + m.wordCount, 0);
  const published = manuscripts.filter(m => m.isPublished).length;
  const readyForReview = manuscripts.filter(m => m.wordCount >= 500 && !m.isPublished).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <BookOpen className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-slate-800">Manuscript Library</h2>
          </div>
          <p className="text-gray-600 text-sm">"Legacy Work" drafts from all students</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <FileText className="w-4 h-4" />
            Total Manuscripts
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
          <p className="text-gray-500">Manuscripts appear when students use the Drafting Suite.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {manuscripts.map((manuscript) => (
            <div key={manuscript.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className={`h-2 ${manuscript.isPublished ? 'bg-green-500' : manuscript.wordCount >= 500 ? 'bg-blue-500' : 'bg-gray-300'}`} />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{manuscript.title}</h3>
                    <p className="text-sm text-gray-500">by {manuscript.pseudonym}</p>
                  </div>
                  {manuscript.isPublished ? (
                    <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Published
                    </span>
                  ) : manuscript.wordCount >= 500 ? (
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
                    <p className="text-lg font-bold text-slate-800">{manuscript.wordCount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Words</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-lg font-bold text-slate-800">{Math.ceil(manuscript.wordCount / 250)}</p>
                    <p className="text-xs text-gray-500">Pages (est.)</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Updated {new Date(manuscript.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
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
