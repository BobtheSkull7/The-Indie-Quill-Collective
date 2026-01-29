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

function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);
  
  useEffect(() => {
    if (value === prevValue.current) return;
    
    const diff = value - prevValue.current;
    const steps = Math.min(Math.abs(diff), 20);
    const stepValue = diff / steps;
    let current = prevValue.current;
    let step = 0;
    
    const timer = setInterval(() => {
      step++;
      current += stepValue;
      setDisplayValue(Math.round(current));
      
      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
        prevValue.current = value;
      }
    }, 30);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span className={className}>{displayValue.toLocaleString()}</span>;
}

function Toast({ message, visible, onHide }: { message: string; visible: boolean; onHide: () => void }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onHide, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);
  
  if (!visible) return null;
  
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-toast-slide">
      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
}

function MilestoneSparkle({ visible }: { visible: boolean }) {
  if (!visible) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-sparkle"
          style={{
            left: `${50 + 40 * Math.cos((i * 30 * Math.PI) / 180)}%`,
            top: `${50 + 40 * Math.sin((i * 30 * Math.PI) / 180)}%`,
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}

function InstallPrompt({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);
    
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  
  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      onDismiss();
    }
  };
  
  if (!visible) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-slate-800 p-4 border-t border-teal-500/30 z-50 animate-slide-up">
      <div className="max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1">Save VibeScribe to Home Screen</h3>
            {isIOS ? (
              <p className="text-slate-400 text-sm">
                Tap <span className="text-white">Share</span> <svg className="inline w-4 h-4 -mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l-5 5h3v9h4V7h3l-5-5z"/><path d="M19 15v4H5v-4H3v6h18v-6h-2z"/></svg> then <span className="text-white">"Add to Home Screen"</span>
              </p>
            ) : (
              <p className="text-slate-400 text-sm">One-tap access to your writing!</p>
            )}
          </div>
          <button onClick={onDismiss} className="text-slate-500 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="w-full mt-3 bg-teal-500 hover:bg-teal-400 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            Install Now
          </button>
        )}
      </div>
    </div>
  );
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
  const [showToast, setShowToast] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const quizPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sessionWordCountRef = useRef(0);
  const [transcribing, setTranscribing] = useState(false);
  
  // Force MediaRecorder + Whisper AI for all browsers (more reliable)
  const hasSpeechRecognition = false;

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
        startQuizPolling(data.user.vibeScribeId);
        
        // Show install prompt if not in standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                            (window.navigator as any).standalone === true;
        const dismissed = localStorage.getItem('vibescribe-install-dismissed');
        if (!isStandalone && !dismissed) {
          setTimeout(() => setShowInstallPrompt(true), 2000);
        }
      } else {
        const data = await res.json();
        setError(data.message || "ID not found");
        if (navigator.vibrate) navigator.vibrate(200);
      }
    } catch {
      setError("Connection error");
    }
  };

  const startQuizPolling = (userVibeScribeId: string) => {
    if (quizPollRef.current) clearInterval(quizPollRef.current);
    
    quizPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/vibe/quiz/active?vibeScribeId=${encodeURIComponent(userVibeScribeId)}`);
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

  const [interimText, setInterimText] = useState("");

  const startAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!isRecordingRef.current) {
          setAudioLevel(0);
          return;
        }
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch {
    }
  };
  
  const stopAudioVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    // Stop all tracks on the MediaStream to release the microphone
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setAudioLevel(0);
  };

  const transcribeAudioBlob = async (blob: Blob) => {
    console.log("[VibeScribe] Transcribing blob:", blob.size, "bytes, type:", blob.type);
    setTranscribing(true);
    setInterimText("Transcribing...");
    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          if (!result) {
            reject(new Error("FileReader returned empty result"));
            return;
          }
          const base64 = result.split(",")[1];
          console.log("[VibeScribe] Base64 audio length:", base64?.length || 0);
          resolve(base64);
        };
        reader.onerror = () => reject(new Error("FileReader error"));
        reader.readAsDataURL(blob);
      });
      
      console.log("[VibeScribe] Sending to /api/vibe/transcribe");
      const res = await fetch("/api/vibe/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64Audio }),
      });
      
      console.log("[VibeScribe] Response status:", res.status);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Transcription failed: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("[VibeScribe] Transcript received:", data.transcript?.slice(0, 50));
      if (data.transcript) {
        setTranscript((prev) => prev + (prev ? " " : "") + data.transcript);
        setLastSnippet(data.transcript);
      } else {
        setError("No speech detected. Try again.");
      }
    } catch (err: any) {
      console.error("[VibeScribe] Transcribe error:", err);
      setError(err.message || "Could not transcribe. Try again.");
    } finally {
      setTranscribing(false);
      setInterimText("");
    }
  };

  const startMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/mp4';
      
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      recorder.start(100);
      isRecordingRef.current = true;
      setIsRecording(true);
      startAudioVisualization();
      if (navigator.vibrate) navigator.vibrate(100);
    } catch (err) {
      setError("Microphone blocked. Allow in settings.");
    }
  };
  
  const stopMediaRecorder = async () => {
    return new Promise<Blob>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state !== "recording") {
        resolve(new Blob());
        return;
      }
      
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        resolve(blob);
      };
      
      recorder.stop();
    });
  };

  const toggleRecording = async () => {
    console.log("[VibeScribe] toggleRecording called, isRecording:", isRecording, "usingWhisperAI: true");
    
    if (isRecording) {
      // Stop recording
      console.log("[VibeScribe] Stopping recording...");
      isRecordingRef.current = false;
      stopAudioVisualization();
      
      if (hasSpeechRecognition && recognitionRef.current) {
        console.log("[VibeScribe] Stopping Web Speech API");
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } else if (mediaRecorderRef.current) {
        console.log("[VibeScribe] Stopping MediaRecorder");
        const blob = await stopMediaRecorder();
        console.log("[VibeScribe] MediaRecorder blob size:", blob.size);
        if (blob.size > 0) {
          await transcribeAudioBlob(blob);
        } else {
          setError("No audio captured. Try again.");
        }
        mediaRecorderRef.current = null;
      } else {
        console.log("[VibeScribe] No recorder to stop");
      }
      
      setIsRecording(false);
      setInterimText("");
      
      // Save if we have content
      if (transcript.trim() && user) {
        await saveTranscript();
      }
    } else {
      // Start recording
      setError("");
      setInterimText("");
      sessionWordCountRef.current = 0;
      
      if (hasSpeechRecognition) {
        // Use native Web Speech API
        console.log("[VibeScribe] Starting Web Speech API");
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;
        
        recognition.onstart = () => {
          console.log("[VibeScribe] Web Speech started");
        };
        
        recognition.onaudiostart = () => {
          console.log("[VibeScribe] Audio capture started");
        };
        
        recognition.onspeechstart = () => {
          console.log("[VibeScribe] Speech detected");
        };
        
        recognition.onresult = (event: any) => {
          console.log("[VibeScribe] Got result, results count:", event.results.length);
          let finalText = "";
          let interim = "";
          
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalText += result[0].transcript + " ";
            } else {
              interim += result[0].transcript;
            }
          }
          
          console.log("[VibeScribe] Final:", finalText, "Interim:", interim);
          
          if (finalText) {
            setTranscript((prev) => prev + finalText);
            setLastSnippet(finalText.trim());
            setInterimText("");
          } else if (interim) {
            setInterimText(interim);
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error("[VibeScribe] Speech error:", event.error);
          if (event.error === 'no-speech') {
            console.log("[VibeScribe] No speech detected, will restart if still recording");
          } else if (event.error === 'not-allowed') {
            const msg = "Microphone blocked. Allow in browser settings.";
            setError(msg);
            alert(msg);
            isRecordingRef.current = false;
            setIsRecording(false);
          } else if (event.error === 'aborted') {
            console.log("[VibeScribe] Recognition aborted");
          } else if (event.error === 'network') {
            const msg = "Network error - Speech recognition requires internet.";
            setError(msg);
            alert(msg);
            isRecordingRef.current = false;
            setIsRecording(false);
          } else {
            const msg = `Speech error: ${event.error}`;
            setError(msg);
            alert(msg);
            isRecordingRef.current = false;
            setIsRecording(false);
          }
        };
        
        recognition.onend = () => {
          console.log("[VibeScribe] Recognition ended, isRecordingRef:", isRecordingRef.current);
          if (isRecordingRef.current) {
            setTimeout(() => {
              try {
                console.log("[VibeScribe] Restarting recognition");
                recognition.start();
              } catch (e) {
                console.error("[VibeScribe] Failed to restart:", e);
                isRecordingRef.current = false;
                setIsRecording(false);
              }
            }, 100);
          }
        };
        
        recognitionRef.current = recognition;
        isRecordingRef.current = true;
        
        try {
          recognition.start();
          console.log("[VibeScribe] Recognition.start() called");
          setIsRecording(true);
          startAudioVisualization();
          if (navigator.vibrate) navigator.vibrate(100);
        } catch (err: any) {
          const msg = `Could not start: ${err.message}`;
          console.error("[VibeScribe] Start failed:", err);
          setError(msg);
          alert(msg);
        }
      } else {
        // Use MediaRecorder + API transcription (iOS PWA fallback)
        await startMediaRecorder();
      }
    }
  };

  const saveTranscript = async () => {
    if (!transcript.trim() || !user) return;
    
    const wordsSaved = transcript.trim().split(/\s+/).filter(Boolean).length;
    sessionWordCountRef.current += wordsSaved;
    
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
        const prevCount = familyWordCount;
        const newCount = data.familyWordCount || familyWordCount;
        setFamilyWordCount(newCount);
        setTranscript("");
        setShowToast(true);
        
        // Check for 100-word milestone
        const prevHundred = Math.floor(prevCount / 100);
        const newHundred = Math.floor(newCount / 100);
        if (newHundred > prevHundred) {
          setShowMilestone(true);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
          setTimeout(() => setShowMilestone(false), 1000);
        } else {
          if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        }
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
          <Toast 
            message="Story Saved to Legacy Work!" 
            visible={showToast} 
            onHide={() => setShowToast(false)} 
          />
          
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
            {/* Waveform visualizer */}
            {isRecording && (
              <div className="flex items-end justify-center gap-1 h-12 mb-4">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 bg-gradient-to-t from-teal-500 to-teal-300 rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(8, audioLevel * 48 * (0.5 + Math.sin(Date.now() / 100 + i) * 0.5))}px`,
                    }}
                  />
                ))}
              </div>
            )}
            
            <div className="relative">
              <button
                onClick={toggleRecording}
                style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}
                className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 select-none ${
                  isRecording
                    ? "bg-red-500 scale-110 animate-recording-pulse"
                    : "bg-gradient-to-br from-teal-500 to-teal-600 active:from-teal-400 active:to-teal-500 shadow-lg shadow-teal-500/30"
                }`}
                >
                {isRecording && (
                  <div 
                    className="absolute inset-0 rounded-full bg-red-500/30 animate-ping"
                    style={{ animationDuration: '1.5s' }}
                  />
                )}
              <div className="text-center text-white pointer-events-none select-none">
                {isRecording ? (
                  <>
                    <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                    </svg>
                    <span className="text-sm font-medium">Tap to Stop</span>
                  </>
                ) : (
                  <>
                    <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                    </svg>
                    <span className="text-sm font-medium">Tap to Speak</span>
                  </>
                )}
              </div>
            </button>
            </div>
            
            {/* Always show status */}
            <div className="mt-6 bg-slate-800 rounded-xl p-4 w-full">
              {isRecording ? (
                <div>
                  <p className="text-red-400 text-center animate-pulse mb-2">Listening... speak now</p>
                  {interimText && (
                    <p className="text-slate-400 text-sm italic text-center">"{interimText}"</p>
                  )}
                  {transcript && (
                    <p className="text-slate-300 text-sm mt-2">{transcript}</p>
                  )}
                </div>
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
                <p className="text-slate-500 text-center text-sm">Tap button and speak clearly</p>
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
          
          <div className="relative text-center bg-slate-800/50 rounded-xl p-4 w-full max-w-md">
            <MilestoneSparkle visible={showMilestone} />
            <p className="text-slate-400 text-sm mb-1">
              {user.familyUnitId ? "Family Word Count" : "Word Count"}
            </p>
            <p className="text-4xl font-bold text-teal-400 font-mono">
              <AnimatedCounter value={familyWordCount} />
            </p>
            {showMilestone && (
              <p className="text-yellow-400 text-sm mt-1 animate-bounce">
                🎉 Milestone Reached!
              </p>
            )}
          </div>
          
          <InstallPrompt 
            visible={showInstallPrompt} 
            onDismiss={() => {
              setShowInstallPrompt(false);
              localStorage.setItem('vibescribe-install-dismissed', 'true');
            }} 
          />
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
