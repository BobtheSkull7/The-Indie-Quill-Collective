import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRecording } from "../hooks/useRecording";
import { transcribeAudio, saveDraft, checkActiveQuiz, submitQuizAnswer } from "../api";
import { User, Quiz } from "../types";

interface Props {
  user: User;
  onLogout: () => void;
}

export function RecordingScreen({ user, onLogout }: Props) {
  const [transcript, setTranscript] = useState("");
  const [familyWordCount, setFamilyWordCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  
  const { isRecording, isTranscribing, startRecording, stopRecording } = useRecording();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const quizPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quizTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeQuiz && activeQuiz.timeLeft > 0) {
      quizTimerRef.current = setInterval(() => {
        setActiveQuiz((prev) => {
          if (!prev || prev.timeLeft <= 1) {
            if (quizTimerRef.current) clearInterval(quizTimerRef.current);
            return null;
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
      
      return () => {
        if (quizTimerRef.current) clearInterval(quizTimerRef.current);
      };
    }
  }, [activeQuiz?.id]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  useEffect(() => {
    quizPollRef.current = setInterval(async () => {
      try {
        const quiz = await checkActiveQuiz(user.vibeScribeId);
        if (quiz && !activeQuiz) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setActiveQuiz(quiz);
        }
      } catch {}
    }, 5000);

    return () => {
      if (quizPollRef.current) clearInterval(quizPollRef.current);
    };
  }, [user.vibeScribeId, activeQuiz]);

  const handleToggleRecording = async () => {
    setError("");
    
    if (isRecording) {
      try {
        const base64Audio = await stopRecording();
        if (base64Audio) {
          const text = await transcribeAudio(base64Audio);
          if (text) {
            setTranscript((prev) => prev + (prev ? " " : "") + text);
            await saveCurrentDraft(transcript + (transcript ? " " : "") + text);
          }
        }
      } catch (err) {
        setError("Could not transcribe. Try again.");
      }
    } else {
      try {
        await startRecording();
      } catch {
        setError("Microphone access denied.");
      }
    }
  };

  const saveCurrentDraft = async (content: string) => {
    if (!content.trim()) return;
    
    setSaving(true);
    try {
      const result = await saveDraft(user.vibeScribeId, content);
      setFamilyWordCount(result.familyWordCount);
      setTranscript("");
      setShowToast(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setShowToast(false), 2000);
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuizAnswer = async (answer: string) => {
    if (!activeQuiz) return;
    
    setSelectedAnswer(answer);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await submitQuizAnswer(activeQuiz.id, user.vibeScribeId, answer);
      setTimeout(() => {
        setActiveQuiz(null);
        setSelectedAnswer(null);
      }, 1000);
    } catch {}
  };

  if (activeQuiz) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.quizContainer}>
          <Text style={styles.quizTitle}>Challenge Time!</Text>
          <Text style={styles.quizQuestion}>{activeQuiz.question}</Text>
          <Text style={styles.quizTimer}>{activeQuiz.timeLeft}s</Text>
          
          <View style={styles.quizOptions}>
            {activeQuiz.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.quizOption,
                  selectedAnswer === option && styles.quizOptionSelected,
                ]}
                onPress={() => handleQuizAnswer(option)}
                disabled={!!selectedAnswer}
              >
                <Text style={styles.quizOptionLabel}>
                  {String.fromCharCode(65 + index)}
                </Text>
                <Text style={styles.quizOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutText}>← Logout</Text>
        </TouchableOpacity>
        <Text style={styles.welcomeText}>Welcome, {user.firstName}!</Text>
        <Text style={styles.idText}>{user.vibeScribeId}</Text>
      </View>

      {showToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Story Saved to Legacy Work!</Text>
        </View>
      )}

      <View style={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
            ]}
            onPress={handleToggleRecording}
            disabled={isTranscribing || saving}
          >
            {isTranscribing ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <View style={styles.recordButtonContent}>
                {isRecording ? (
                  <>
                    <View style={styles.stopIcon} />
                    <Text style={styles.recordButtonText}>Tap to Stop</Text>
                  </>
                ) : (
                  <>
                    <View style={styles.micIcon}>
                      <View style={styles.micHead} />
                      <View style={styles.micBase} />
                    </View>
                    <Text style={styles.recordButtonText}>Tap to Speak</Text>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.statusBox}>
          {isRecording ? (
            <Text style={styles.statusRecording}>Listening... speak now</Text>
          ) : isTranscribing ? (
            <Text style={styles.statusTranscribing}>Transcribing...</Text>
          ) : transcript ? (
            <>
              <Text style={styles.transcriptText} numberOfLines={3}>
                {transcript}
              </Text>
              <View style={styles.transcriptActions}>
                <Text style={styles.wordCount}>
                  {transcript.split(/\s+/).filter(Boolean).length} words
                </Text>
                <TouchableOpacity
                  onPress={() => saveCurrentDraft(transcript)}
                  disabled={saving}
                >
                  <Text style={styles.saveButton}>
                    {saving ? "Saving..." : "Save Now"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.statusIdle}>Tap button and speak clearly</Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>
          {user.familyUnitId ? "Family Word Count" : "Word Count"}
        </Text>
        <Text style={styles.footerCount}>{familyWordCount.toLocaleString()}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 8,
  },
  logoutText: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 8,
  },
  welcomeText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  idText: {
    color: "#94a3b8",
    fontFamily: "monospace",
    fontSize: 14,
  },
  toast: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: "#14b8a6",
    borderRadius: 12,
    padding: 16,
    zIndex: 100,
  },
  toastText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  error: {
    color: "#f87171",
    marginBottom: 16,
  },
  recordButton: {
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: "#14b8a6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  recordButtonActive: {
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
  },
  recordButtonContent: {
    alignItems: "center",
  },
  stopIcon: {
    width: 48,
    height: 48,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
  },
  micIcon: {
    alignItems: "center",
    marginBottom: 8,
  },
  micHead: {
    width: 32,
    height: 48,
    backgroundColor: "#fff",
    borderRadius: 16,
  },
  micBase: {
    width: 48,
    height: 16,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -8,
  },
  recordButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  statusBox: {
    marginTop: 24,
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    minHeight: 80,
  },
  statusRecording: {
    color: "#f87171",
    textAlign: "center",
  },
  statusTranscribing: {
    color: "#94a3b8",
    textAlign: "center",
  },
  statusIdle: {
    color: "#64748b",
    textAlign: "center",
  },
  transcriptText: {
    color: "#cbd5e1",
    fontSize: 14,
  },
  transcriptActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  wordCount: {
    color: "#64748b",
    fontSize: 12,
  },
  saveButton: {
    color: "#14b8a6",
    fontWeight: "600",
  },
  footer: {
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: 16,
    padding: 16,
    margin: 24,
    alignItems: "center",
  },
  footerLabel: {
    color: "#94a3b8",
    fontSize: 14,
  },
  footerCount: {
    color: "#14b8a6",
    fontSize: 40,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  quizContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  quizTitle: {
    color: "#fbbf24",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
  },
  quizQuestion: {
    color: "#fff",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  quizTimer: {
    color: "#f87171",
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 32,
  },
  quizOptions: {
    width: "100%",
    gap: 12,
  },
  quizOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  quizOptionSelected: {
    borderColor: "#14b8a6",
    backgroundColor: "#134e4a",
  },
  quizOptionLabel: {
    color: "#14b8a6",
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 12,
    width: 28,
  },
  quizOptionText: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
  },
});
