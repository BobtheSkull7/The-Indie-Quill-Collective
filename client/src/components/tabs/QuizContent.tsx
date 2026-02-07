import { useState, useEffect } from "react";
import { Zap, Rocket } from "lucide-react";

interface CohortForQuiz {
  id: number;
  label: string;
  cohortType: string;
  grantName: string | null;
  grantYear: number | null;
  status: string;
  activeVibeUsers: number;
}

export default function QuizContent() {
  const [cohortsForQuiz, setCohortsForQuiz] = useState<CohortForQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [quizData, setQuizData] = useState({
    cohortId: 0,
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    timeLimit: 60,
  });

  useEffect(() => {
    fetchCohortsForQuiz();
  }, []);

  const fetchCohortsForQuiz = async () => {
    try {
      const res = await fetch("/api/admin/cohorts/for-quiz", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCohortsForQuiz(data.cohorts || []);
      }
    } catch {
      console.error("Failed to fetch cohorts for quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizData.cohortId || !quizData.question.trim()) return;

    setTriggering(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/trigger-cohort-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cohortId: quizData.cohortId,
          question: quizData.question,
          options: [quizData.optionA, quizData.optionB, quizData.optionC, quizData.optionD],
          timeLimit: quizData.timeLimit,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: 'success', text: `Quiz triggered! ${data.targetedUsers} users will receive it.` });
        setShowQuizForm(false);
        setQuizData({ cohortId: 0, question: "", optionA: "", optionB: "", optionC: "", optionD: "", timeLimit: 60 });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Failed to trigger quiz' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection error' });
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Rocket className="w-6 h-6" />
              Live Family Quiz Trigger
            </h2>
            <p className="text-purple-200 mt-1">
              Push a quiz to all VibeScribe users in a cohort
            </p>
          </div>
          <button
            onClick={() => setShowQuizForm(!showQuizForm)}
            className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center gap-2"
          >
            <Zap className="w-5 h-5" />
            Trigger Live Quiz
          </button>
        </div>

        {showQuizForm && (
          <form onSubmit={handleTriggerQuiz} className="mt-6 bg-white/10 rounded-lg p-6 backdrop-blur">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Target Cohort</label>
                <select
                  value={quizData.cohortId}
                  onChange={(e) => setQuizData({ ...quizData, cohortId: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60"
                  required
                >
                  <option value={0} className="text-gray-900">Select a cohort...</option>
                  {cohortsForQuiz.map((c) => (
                    <option key={c.id} value={c.id} className="text-gray-900">
                      {c.label} ({c.cohortType === 'grant' ? c.grantName || 'Grant' : 'Writer'}) - {c.activeVibeUsers} active users
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Question</label>
                <input
                  type="text"
                  value={quizData.question}
                  onChange={(e) => setQuizData({ ...quizData, question: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60"
                  placeholder="What is the main character's name?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Option A</label>
                <input
                  type="text"
                  value={quizData.optionA}
                  onChange={(e) => setQuizData({ ...quizData, optionA: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Option B</label>
                <input
                  type="text"
                  value={quizData.optionB}
                  onChange={(e) => setQuizData({ ...quizData, optionB: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Option C</label>
                <input
                  type="text"
                  value={quizData.optionC}
                  onChange={(e) => setQuizData({ ...quizData, optionC: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Option D</label>
                <input
                  type="text"
                  value={quizData.optionD}
                  onChange={(e) => setQuizData({ ...quizData, optionD: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Time Limit (seconds)</label>
                <input
                  type="number"
                  value={quizData.timeLimit}
                  onChange={(e) => setQuizData({ ...quizData, timeLimit: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white"
                  min={10}
                  max={120}
                />
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={triggering}
                className="bg-white text-purple-600 px-6 py-2 rounded-lg font-semibold hover:bg-purple-50 disabled:opacity-50 flex items-center gap-2"
              >
                {triggering ? "Triggering..." : "Send Quiz Now"}
              </button>
              <button
                type="button"
                onClick={() => setShowQuizForm(false)}
                className="bg-white/20 px-6 py-2 rounded-lg hover:bg-white/30"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
