import { useState, useEffect, useRef, useCallback } from "react";

type Screen = "keypad" | "hub" | "challenge";

interface VibeUser {
  id: string;
  firstName: string;
  vibeScribeId: string;
  familyUnitId: number | null;
  familyWordCount: number;
}

interface Quiz {
  id: number;
  question: string;
  options: string[];
  timeLimit: number;
}

export default function VibeScribe() {
  const [screen, setScreen] = useState<Screen>("keypad");
  const [vibeId, setVibeId] = useState("");
  const [user, setUser] = useState<VibeUser | null>(null);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastSnippet, setLastSnippet] = useState("");
  const [familyWordCount, setFamilyWordCount] = useState(0);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizTimeLeft, setQuizTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const quizPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatVibeId = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    if (digits.length > 3) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    return digits;
  };

  const handleKeypadInput = (digit: string) => {
    if (vibeId.replace("-", "").length < 6) {
      const newValue = vibeId.replace("-", "") + digit;
      setVibeId(formatVibeId(newValue));
    }
  };

  const handleKeypadBackspace = () => {
    const digits = vibeId.replace("-", "");
    if (digits.length > 0) {
      setVibeId(formatVibeId(digits.slice(0, -1)));
    }
  };

  const handleKeypadClear = () => {
    setVibeId("");
    setError("");
  };

  useEffect(() => {
    const rawDigits = vibeId.replace("-", "");
    if (rawDigits.length === 6) {
      verifyVibeId(vibeId);
    }
  }, [vibeId]);

  const verifyVibeId = async (id: string) => {
    try {
      setError("");
      const res = await fetch("/api/vibe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibeScribeId: id }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setFamilyWordCount(data.familyWordCount || 0);
        setScreen("hub");
        startQuizPolling();
      } else {
        const data = await res.json();
        setError(data.message || "ID not found");
        if (navigator.vibrate) navigator.vibrate(200);
      }
    } catch {
      setError("Connection error");
    }
  };

  const startQuizPolling = () => {
    if (quizPollRef.current) clearInterval(quizPollRef.current);
    
    quizPollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/vibe/quiz/active");
        if (res.ok) {
          const data = await res.json();
          if (data.quiz && !activeQuiz) {
            setActiveQuiz(data.quiz);
            setQuizTimeLeft(data.quiz.timeLimit);
            setSelectedAnswer(null);
            setScreen("challenge");
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          }
        }
      } catch {
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (quizPollRef.current) clearInterval(quizPollRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  useEffect(() => {
    if (quizTimeLeft > 0 && screen === "challenge") {
      const timer = setTimeout(() => setQuizTimeLeft(quizTimeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (quizTimeLeft === 0 && activeQuiz) {
      handleQuizTimeout();
    }
  }, [quizTimeLeft, screen, activeQuiz]);

  const handleQuizTimeout = () => {
    setActiveQuiz(null);
    setScreen("hub");
  };

  const submitQuizAnswer = async (answer: string) => {
    if (!user || !activeQuiz) return;
    
    setSelectedAnswer(answer);
    if (navigator.vibrate) navigator.vibrate(50);
    
    try {
      await fetch("/api/vibe/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vibeScribeId: user.vibeScribeId,
          quizId: activeQuiz.id,
          answer,
        }),
      });
    } catch {
    }
    
    setTimeout(() => {
      setActiveQuiz(null);
      setScreen("hub");
    }, 1000);
  };

  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice not supported. Try Chrome or Safari.");
      return null;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    
    recognition.onstart = () => {
      console.log("[VibeScribe] Speech recognition started");
    };
    
    recognition.onaudiostart = () => {
      console.log("[VibeScribe] Audio capture started");
    };
    
    recognition.onspeechstart = () => {
      console.log("[VibeScribe] Speech detected!");
    };
    
    recognition.onresult = (event: any) => {
      console.log("[VibeScribe] Got result event:", event.results.length, "results");
      let finalTranscript = "";
      let interimTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      console.log("[VibeScribe] Final:", finalTranscript, "Interim:", interimTranscript);
      
      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
        setLastSnippet(finalTranscript.trim());
      }
      
      // Show interim results too
      if (interimTranscript && !finalTranscript) {
        setLastSnippet(interimTranscript);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error("[VibeScribe] Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        setError("Microphone blocked. Please allow access.");
      } else if (event.error === 'no-speech') {
        setError("No speech detected. Try speaking louder.");
      } else if (event.error === 'audio-capture') {
        setError("No microphone found.");
      } else if (event.error === 'network') {
        setError("Network error. Check internet connection.");
      } else {
        setError(`Voice error: ${event.error}`);
      }
      setIsRecording(false);
    };
    
    recognition.onend = () => {
      console.log("[VibeScribe] Speech recognition ended");
    };
    
    return recognition;
  }, []);

  const startRecording = async () => {
    setError("");
    
    // Request microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError("Microphone access denied. Please allow in browser settings.");
      return;
    }
    
    if (!recognitionRef.current) {
      recognitionRef.current = initSpeechRecognition();
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        if (navigator.vibrate) navigator.vibrate(100);
      } catch (err: any) {
        if (err.message?.includes('already started')) {
          setIsRecording(true);
        } else {
          setError("Could not start voice. Try again.");
          console.error("Recognition start error:", err);
        }
      }
    }
  };

  const stopRecording = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    
    if (transcript.trim() && user) {
      await saveTranscript();
    }
  };

  const saveTranscript = async () => {
    if (!transcript.trim() || !user) return;
    
    setSaving(true);
    try {
      const res = await fetch("/api/vibe/save-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vibeScribeId: user.vibeScribeId,
          content: transcript,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setFamilyWordCount(data.familyWordCount || familyWordCount);
        setTranscript("");
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      }
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const playLastSnippet = () => {
    if (lastSnippet && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(lastSnippet);
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  const logout = () => {
    setUser(null);
    setVibeId("");
    setTranscript("");
    setLastSnippet("");
    setScreen("keypad");
    if (quizPollRef.current) clearInterval(quizPollRef.current);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
      {screen === "keypad" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">VibeScribe</h1>
            <p className="text-slate-400">Enter your Author ID</p>
          </div>
          
          <div className="bg-slate-800 rounded-2xl p-4 mb-6 w-full max-w-xs">
            <div className="text-center text-4xl font-mono text-white tracking-widest min-h-[3rem] flex items-center justify-center">
              {vibeId || <span className="text-slate-600">___-___</span>}
            </div>
          </div>
          
          {error && (
            <div className="text-red-400 mb-4 text-center animate-shake">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                onClick={() => handleKeypadInput(String(digit))}
                className="aspect-square bg-slate-700 hover:bg-slate-600 active:bg-teal-600 text-white text-2xl font-bold rounded-xl transition-all duration-150 active:scale-95"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={handleKeypadClear}
              className="aspect-square bg-red-900/50 hover:bg-red-800/50 active:bg-red-700 text-red-300 text-lg font-bold rounded-xl transition-all"
            >
              CLR
            </button>
            <button
              onClick={() => handleKeypadInput("0")}
              className="aspect-square bg-slate-700 hover:bg-slate-600 active:bg-teal-600 text-white text-2xl font-bold rounded-xl transition-all duration-150 active:scale-95"
            >
              0
            </button>
            <button
              onClick={handleKeypadBackspace}
              className="aspect-square bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-lg font-bold rounded-xl transition-all"
            >
              ←
            </button>
          </div>
        </div>
      )}

      {screen === "hub" && user && (
        <div className="flex-1 flex flex-col items-center justify-between p-6">
          <div className="text-center">
            <button
              onClick={logout}
              className="text-slate-400 text-sm mb-2 hover:text-white"
            >
              ← Logout
            </button>
            <h2 className="text-2xl font-bold text-white">
              Welcome, {user.firstName}!
            </h2>
            <p className="text-slate-400 font-mono">{user.vibeScribeId}</p>
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
              onContextMenu={(e) => e.preventDefault()}
              style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}
              className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 select-none touch-none ${
                isRecording
                  ? "bg-red-500 scale-110 shadow-lg shadow-red-500/50 animate-pulse"
                  : "bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 shadow-lg shadow-teal-500/30"
              }`}
            >
              <div className="text-center text-white pointer-events-none select-none">
                {isRecording ? (
                  <>
                    <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                    <span className="text-sm font-medium">Release to Stop</span>
                  </>
                ) : (
                  <>
                    <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                    </svg>
                    <span className="text-sm font-medium">Hold to Speak</span>
                  </>
                )}
              </div>
            </button>
            
            {/* Always show status */}
            <div className="mt-6 bg-slate-800 rounded-xl p-4 w-full">
              {isRecording ? (
                <p className="text-red-400 text-center animate-pulse">Listening... speak now</p>
              ) : transcript ? (
                <>
                  <p className="text-slate-300 text-sm line-clamp-3">{transcript}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-slate-500 text-xs">
                      {transcript.split(/\s+/).filter(Boolean).length} words
                    </span>
                    <button
                      onClick={saveTranscript}
                      disabled={saving}
                      className="text-teal-400 text-sm font-medium hover:text-teal-300 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Now"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-center text-sm">Hold button and speak clearly</p>
              )}
            </div>
            
            {lastSnippet && !isRecording && (
              <button
                onClick={playLastSnippet}
                className="mt-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span className="text-sm">Play last snippet</span>
              </button>
            )}
          </div>
          
          <div className="text-center bg-slate-800/50 rounded-xl p-4 w-full max-w-md">
            <p className="text-slate-400 text-sm mb-1">Word Count</p>
            <p className="text-4xl font-bold text-teal-400 font-mono">
              {familyWordCount.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {screen === "challenge" && activeQuiz && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-purple-900 to-slate-900">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500 text-white text-2xl font-bold mb-4 animate-pulse">
              {quizTimeLeft}
            </div>
            <h2 className="text-xl font-bold text-white px-4">
              {activeQuiz.question}
            </h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            {["A", "B", "C", "D"].map((letter, index) => (
              <button
                key={letter}
                onClick={() => submitQuizAnswer(letter)}
                disabled={selectedAnswer !== null}
                className={`aspect-square text-4xl font-bold rounded-2xl transition-all duration-200 ${
                  selectedAnswer === letter
                    ? "bg-teal-500 text-white scale-105"
                    : selectedAnswer !== null
                    ? "bg-slate-700 text-slate-500"
                    : "bg-slate-700 hover:bg-slate-600 active:bg-purple-600 text-white active:scale-95"
                }`}
              >
                <div className="flex flex-col items-center">
                  <span>{letter}</span>
                  {activeQuiz.options[index] && (
                    <span className="text-sm font-normal mt-1 opacity-75">
                      {activeQuiz.options[index]}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
