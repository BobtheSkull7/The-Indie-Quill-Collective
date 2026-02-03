import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
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
  const [lastAudioUri, setLastAudioUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isSpeakerMode, setIsSpeakerMode] = useState(true);
  const [isAudioReady, setIsAudioReady] = useState(false);

  const { isRecording, isTranscribing, startRecording, stopRecording } = useRecording();
  
  // Initialize audio mode once on mount with MixWithOthers for screen recording compatibility
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: true,
    });
  }, []);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const quizPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quizTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptScrollRef = useRef<ScrollView>(null);

  // Clean up sound on unmount
  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

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

  useEffect(() => {
    if (transcript && transcriptScrollRef.current) {
      setTimeout(() => {
        transcriptScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [transcript]);

  const toggleSpeakerMode = async () => {
    const newMode = !isSpeakerMode;
    setIsSpeakerMode(newMode);
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: !newMode,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: !newMode,
        staysActiveInBackground: true,
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.error("Failed to toggle speaker mode:", err);
    }
  };

  // Pre-load audio for instant playback
  const preloadAudio = async (uri: string) => {
    try {
      setIsAudioReady(false);
      if (sound) {
        await sound.unloadAsync();
      }
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, volume: 1.0 }
      );
      setSound(newSound);
      setIsAudioReady(true);
    } catch (err) {
      console.error("Audio preload error:", err);
    }
  };

  const playLastSnippet = async () => {
    if (!sound && !lastAudioUri) return;
    try {
      // Set speaker/earpiece mode with MixWithOthers for screen recording compatibility
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: !isSpeakerMode,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: !isSpeakerMode,
        staysActiveInBackground: true,
      });
      
      if (sound && isAudioReady) {
        // Use pre-loaded sound - instant playback
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } else if (lastAudioUri) {
        // Fallback: load and play
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: lastAudioUri },
          { shouldPlay: true, volume: 1.0 }
        );
        setSound(newSound);
        setIsAudioReady(true);
      }
    } catch (err) {
      console.error("Playback error:", err);
      setError("Playback failed.");
    }
  };

  const handleQuizAnswer = async (answer: string) => {
    if (!activeQuiz) return;
    setSelectedAnswer(answer);
    try {
      await submitQuizAnswer(activeQuiz.id, user.id, answer);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        setActiveQuiz(null);
        setSelectedAnswer(null);
      }, 1500);
    } catch (err) {
      setError("Failed to submit answer");
    }
  };

  const [transcribing, setTranscribing] = useState(false);

  const handleToggleRecording = async () => {
    setError("");

    if (isRecording) {
      try {
        const uri = await stopRecording();
        if (uri) {
          setLastAudioUri(uri);
          setIsAudioReady(false);
          setTranscribing(true);
          
          // Pre-load audio in background while transcribing
          preloadAudio(uri);
          
          const text = await transcribeAudio(uri);
          setTranscribing(false);
          if (text) {
            setTranscript((prev) => prev + (prev ? " " : "") + text);
            await saveCurrentDraft(text);
          }
        }
      } catch (err: any) {
        setTranscribing(false);
        console.error("Transcription Failed:", err);
        const errorMsg = err.message || "Could not connect to server";
        setError(`Error: ${errorMsg}`);
        Alert.alert(
          "Transcription Failed",
          errorMsg,
          [{ text: "OK" }]
        );
      }
    } else {
      try {
        setTranscript("");
        setError("");
        await startRecording();
      } catch (err: any) {
        const msg = err?.message?.toLowerCase() || "";
        console.error("Recording start error:", err);
        if (msg.includes("permission") || msg.includes("denied")) {
          setError("Microphone access denied.");
        } else {
          setError("Could not start recording.");
        }
      }
    }
  };

  const saveCurrentDraft = async (content: string) => {
    if (!content.trim()) return;

    setSaving(true);
    try {
      const result = await saveDraft(user.vibeScribeId, content);
      setFamilyWordCount(result.familyWordCount);
      setShowToast(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setShowToast(false), 2000);
    } catch {
      setError("Could not save to Cloud. Check Render logs.");
    } finally {
      setSaving(false);
    }
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
            disabled={isTranscribing || transcribing || saving}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            {isTranscribing || transcribing ? (
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

        <View style={styles.audioModeToggle}>
          <TouchableOpacity 
            onPress={toggleSpeakerMode}
            style={[styles.speakerButton, isSpeakerMode && styles.speakerButtonActive]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.speakerIcon}>{isSpeakerMode ? '🔊' : '📱'}</Text>
            <Text style={styles.speakerText}>{isSpeakerMode ? 'Speaker' : 'Earpiece'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusBox}>
          {isRecording ? (
            <Text style={styles.statusRecording}>Listening... speak now</Text>
          ) : isTranscribing || transcribing ? (
            <View style={styles.transcribingContainer}>
              <ActivityIndicator size="small" color="#14b8a6" />
              <Text style={styles.statusTranscribing}>Sending to server...</Text>
            </View>
          ) : transcript ? (
            <ScrollView 
              ref={transcriptScrollRef}
              style={styles.transcriptScroll}
              onContentSizeChange={() => transcriptScrollRef.current?.scrollToEnd({ animated: true })}
            >
              <View style={styles.transcriptBox}>
                <Text style={styles.transcriptLabel}>Your words:</Text>
                <Text style={styles.transcriptText}>{transcript}</Text>
              </View>
              <View style={styles.transcriptActions}>
                <TouchableOpacity 
                  onPress={playLastSnippet} 
                  style={styles.actionButton}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <Text style={styles.playButtonText}>▶</Text>
                  <Text style={styles.actionButtonText}>Replay</Text>
                </TouchableOpacity>
                <Text style={styles.wordCount}>
                  {transcript.split(/\s+/).filter(Boolean).length} words
                </Text>
                <TouchableOpacity
                  onPress={() => saveCurrentDraft(transcript)}
                  disabled={saving}
                  style={styles.actionButton}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <Text style={[styles.saveButtonText, saving && { opacity: 0.5 }]}>
                    {saving ? "..." : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View>
              <Text style={styles.statusIdle}>Tap button and speak clearly</Text>
              {lastAudioUri && (
                <TouchableOpacity 
                  onPress={playLastSnippet} 
                  style={styles.reviewButton}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                   <Text style={styles.reviewButtonText}>▶ Review Last Recording</Text>
                </TouchableOpacity>
              )}
            </View>
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
  container: { flex: 1, backgroundColor: "#0f172a" },
  header: { alignItems: "center", paddingTop: 16, paddingBottom: 8 },
  logoutText: { color: "#94a3b8", fontSize: 14, marginBottom: 8 },
  welcomeText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  idText: { color: "#94a3b8", fontFamily: "monospace", fontSize: 14 },
  toast: { position: "absolute", top: 100, left: 20, right: 20, backgroundColor: "#14b8a6", borderRadius: 12, padding: 16, zIndex: 100 },
  toastText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  error: { color: "#f87171", marginBottom: 16, textAlign: 'center' },
  recordButton: { width: 200, height: 200, borderRadius: 100, backgroundColor: "#14b8a6", alignItems: "center", justifyContent: "center" },
  recordButtonActive: { backgroundColor: "#ef4444" },
  recordButtonContent: { alignItems: "center" },
  stopIcon: { width: 80, height: 80, backgroundColor: "#fff", borderRadius: 8, marginBottom: 8 },
  micIcon: { alignItems: "center", marginBottom: 8 },
  micHead: { width: 40, height: 60, backgroundColor: "#fff", borderRadius: 20 },
  micBase: { width: 70, height: 20, backgroundColor: "#fff", borderTopLeftRadius: 35, borderTopRightRadius: 35, marginTop: -10 },
  recordButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  audioModeToggle: { marginTop: 16, alignItems: 'center' },
  speakerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  speakerButtonActive: { backgroundColor: '#14b8a6' },
  speakerIcon: { fontSize: 20, marginRight: 8 },
  speakerText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  statusBox: { marginTop: 16, backgroundColor: "#1e293b", borderRadius: 16, padding: 16, width: "100%", minHeight: 140, justifyContent: 'center' },
  statusRecording: { color: "#f87171", textAlign: "center", fontWeight: 'bold', fontSize: 18 },
  transcribingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  statusTranscribing: { color: "#14b8a6", textAlign: "center", fontSize: 16, marginLeft: 8 },
  statusIdle: { color: "#64748b", textAlign: "center", fontSize: 16 },
  transcriptScroll: { maxHeight: 180 },
  transcriptBox: { backgroundColor: '#0f172a', borderRadius: 12, padding: 12, marginBottom: 8 },
  transcriptLabel: { color: '#14b8a6', fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  transcriptText: { color: "#ffffff", fontSize: 18, lineHeight: 26, fontWeight: '500' },
  transcriptActions: { flexDirection: "row", justifyContent: "space-between", alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  actionButtonText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 16 },
  playButtonText: { color: '#94a3b8', fontSize: 24, marginRight: 4 },
  saveButtonText: { color: '#14b8a6', fontWeight: 'bold', fontSize: 18 },
  reviewButton: { marginTop: 16, padding: 12 },
  reviewButtonText: { color: '#94a3b8', textAlign: 'center', fontSize: 16 },
  wordCount: { color: "#64748b", fontSize: 14 },
  footer: { backgroundColor: "rgba(30, 41, 59, 0.5)", borderRadius: 16, padding: 16, margin: 24, alignItems: "center" },
  footerLabel: { color: "#94a3b8", fontSize: 14 },
  footerCount: { color: "#14b8a6", fontSize: 40, fontWeight: "bold", fontFamily: "monospace" },
  quizContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  quizTitle: { color: "#fbbf24", fontSize: 28, fontWeight: "bold", marginBottom: 16 },
  quizQuestion: { color: "#fff", fontSize: 20, textAlign: "center", marginBottom: 24 },
  quizTimer: { color: "#f87171", fontSize: 48, fontWeight: "bold", marginBottom: 32 },
  quizOptions: { width: "100%", gap: 12 },
  quizOption: { flexDirection: "row", alignItems: "center", backgroundColor: "#1e293b", borderRadius: 12, padding: 16, borderWidth: 2, borderColor: "transparent" },
  quizOptionSelected: { borderColor: "#14b8a6", backgroundColor: "#134e4a" },
  quizOptionLabel: { color: "#14b8a6", fontSize: 18, fontWeight: "bold", marginRight: 12, width: 28 },
  quizOptionText: { color: "#fff", fontSize: 16, flex: 1 },
});