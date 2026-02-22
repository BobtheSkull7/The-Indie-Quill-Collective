import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing } from '../constants/theme';
import {
  requestMicrophonePermission,
  startRecording,
  stopRecording,
  transcribeAudio,
} from '../services/audio';
import { sendTranscript } from '../services/api';

const { width, height } = Dimensions.get('window');
const BUTTON_SIZE = Math.min(width * 0.5, 200);

export default function RecorderScreen() {
  const [scribeId, setScribeId] = useState('');
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [lastAudioUri, setLastAudioUri] = useState<string | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Tap the button to start recording');
  const [hasAIConsent, setHasAIConsent] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const durationTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadScribeId();
    initPermissions();
    loadConsentStatus();
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();

    return () => {
      if (durationTimer.current) clearInterval(durationTimer.current);
    };
  }, []);

  useEffect(() => {
    const words = transcription.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  }, [transcription]);

  const loadScribeId = async () => {
    const id = await SecureStore.getItemAsync('scribe_id');
    if (!id) {
      router.replace('/');
      return;
    }
    setScribeId(id);
    setIsAuthChecked(true);
  };

  const loadConsentStatus = async () => {
    const consent = await SecureStore.getItemAsync('ai_consent');
    setHasAIConsent(consent === 'true');
  };

  const handleConsentAccept = async () => {
    await SecureStore.setItemAsync('ai_consent', 'true');
    setHasAIConsent(true);
    setShowConsentModal(false);
  };

  const initPermissions = async () => {
    const granted = await requestMicrophonePermission();
    setHasMicPermission(granted);
    if (!granted) {
      Alert.alert(
        'Microphone Required',
        'VibeScribe needs microphone access to record your voice. Please enable it in Settings.'
      );
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ]),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    glowAnim.stopAnimation();
    Animated.parallel([
      Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleRecordPress = async () => {
    if (!hasAIConsent) {
      setShowConsentModal(true);
      return;
    }

    if (!hasMicPermission) {
      const granted = await requestMicrophonePermission();
      if (!granted) return;
      setHasMicPermission(true);
    }

    if (isRecording) {
      setIsRecording(false);
      stopPulseAnimation();
      setStatusMessage('Processing your recording...');
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
        durationTimer.current = null;
      }

      const uri = await stopRecording();
      if (uri) {
        setLastAudioUri(uri);
        setIsTranscribing(true);
        setStatusMessage('Transcribing with AI...');

        const text = await transcribeAudio(uri);
        setIsTranscribing(false);

        if (text) {
          setTranscription(text);
          setStatusMessage('Transcription complete! Tap play to hear it back.');
        } else {
          setStatusMessage('Transcription failed. Try recording again.');
        }
      } else {
        setStatusMessage('Recording failed. Please try again.');
      }
    } else {
      setTranscription('');
      setWordCount(0);
      setRecordingDuration(0);
      setLastAudioUri(null);

      const started = await startRecording();
      if (started) {
        setIsRecording(true);
        startPulseAnimation();
        setStatusMessage('Recording... Tap to stop');

        durationTimer.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
      } else {
        setStatusMessage('Could not start recording. Check permissions.');
      }
    }
  };

  const handlePlayback = () => {
    if (!transcription) return;
    if (isPlaying) {
      Speech.stop();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    Speech.speak(transcription, {
      language: 'en-US',
      rate: 0.9,
      onDone: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  };

  const handleSend = async () => {
    if (!transcription || !scribeId) return;
    setIsSending(true);
    setStatusMessage('Sending to your workspace...');

    const result = await sendTranscript(scribeId, transcription);
    setIsSending(false);

    if (result.success) {
      setStatusMessage('Sent to your Scribe workspace!');
      setTimeout(() => {
        setTranscription('');
        setWordCount(0);
        setRecordingDuration(0);
        setStatusMessage('Tap the button to start recording');
      }, 2000);
    } else {
      setStatusMessage(result.error || 'Failed to send. Try again.');
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('scribe_id');
    router.replace('/');
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!isAuthChecked) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>VibeScribe</Text>
          <Text style={styles.scribeIdBadge}>{scribeId}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/history')} style={styles.headerBtn}>
          <Ionicons name="time-outline" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
          <Ionicons name="log-out-outline" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.recordSection}>
        {isRecording && (
          <Text style={styles.duration}>{formatDuration(recordingDuration)}</Text>
        )}

        <View style={styles.buttonContainer}>
          <Animated.View
            style={[
              styles.glowRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: glowAnim,
              },
            ]}
          />
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
              ]}
              onPress={handleRecordPress}
              activeOpacity={0.8}
              disabled={isTranscribing}
            >
              {isTranscribing ? (
                <ActivityIndicator size="large" color={Colors.text} />
              ) : (
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={BUTTON_SIZE * 0.35}
                  color={Colors.text}
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Text style={styles.statusText}>{statusMessage}</Text>
      </View>

      {transcription ? (
        <Animated.View style={styles.resultSection}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{wordCount}</Text>
              <Text style={styles.statLabel}>WORDS</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDuration(recordingDuration)}</Text>
              <Text style={styles.statLabel}>DURATION</Text>
            </View>
          </View>

          <ScrollView style={styles.transcriptBox} showsVerticalScrollIndicator={false}>
            <Text style={styles.transcriptText}>{transcription}</Text>
          </ScrollView>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.playBtn]}
              onPress={handlePlayback}
            >
              <Ionicons
                name={isPlaying ? 'stop-circle' : 'play-circle'}
                size={24}
                color={Colors.text}
              />
              <Text style={styles.actionBtnText}>
                {isPlaying ? 'Stop' : 'Play'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.sendBtn]}
              onPress={handleSend}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <>
                  <Ionicons name="send" size={20} color={Colors.text} />
                  <Text style={styles.actionBtnText}>Send to Workspace</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      ) : (
        <View style={styles.emptyResult}>
          <Ionicons name="mic-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>
            Record your voice to see the{'\n'}transcription appear here
          </Text>
        </View>
      )}

      <Modal
        visible={showConsentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConsentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="shield-checkmark" size={48} color={Colors.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={styles.modalTitle}>AI Transcription & Audio Consent</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalText}>
                To transform your voice into Scribe actions, VibeScribe records your audio and sends it to OpenAI for transcription.
              </Text>
              <View style={styles.modalBullets}>
                <Text style={styles.modalBullet}>{'\u2022'} Your audio is processed securely.</Text>
                <Text style={styles.modalBullet}>{'\u2022'} No audio is used for AI model training.</Text>
                <Text style={styles.modalBullet}>{'\u2022'} You can revoke this permission at any time in Settings.</Text>
              </View>
              <Text style={styles.modalText}>
                Do you consent to sending your audio data to OpenAI for processing?
              </Text>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalDeclineBtn}
                onPress={() => setShowConsentModal(false)}
              >
                <Text style={styles.modalDeclineText}>Not Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConsentBtn}
                onPress={handleConsentAccept}
              >
                <Text style={styles.modalConsentText}>I Consent</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
  },
  scribeIdBadge: {
    fontSize: Fonts.sizes.xs,
    color: Colors.primary,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    fontWeight: Fonts.weights.semibold,
  },
  headerBtn: {
    padding: Spacing.sm,
  },
  recordSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  duration: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.bold,
    color: Colors.recording,
    fontVariant: ['tabular-nums'],
    marginBottom: Spacing.md,
  },
  buttonContainer: {
    width: BUTTON_SIZE + 40,
    height: BUTTON_SIZE + 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: BUTTON_SIZE + 40,
    height: BUTTON_SIZE + 40,
    borderRadius: (BUTTON_SIZE + 40) / 2,
    backgroundColor: Colors.recordingGlow,
  },
  recordButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: Colors.recording,
    shadowColor: Colors.recording,
  },
  statusText: {
    marginTop: Spacing.lg,
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  resultSection: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xxl,
    paddingVertical: Spacing.md,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginTop: 2,
  },
  transcriptBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  transcriptText: {
    fontSize: Fonts.sizes.lg,
    color: Colors.text,
    lineHeight: 30,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  playBtn: {
    backgroundColor: Colors.surfaceLight,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
  },
  actionBtnText: {
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
  },
  emptyResult: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: Fonts.sizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalScroll: {
    maxHeight: 250,
    marginBottom: Spacing.lg,
  },
  modalText: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  modalBullets: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  modalBullet: {
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    lineHeight: 24,
    paddingLeft: Spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalDeclineBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
  },
  modalDeclineText: {
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.semibold,
    color: Colors.textSecondary,
  },
  modalConsentBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalConsentText: {
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
  },
});
