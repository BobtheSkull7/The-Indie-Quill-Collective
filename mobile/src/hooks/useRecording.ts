import { useState, useRef } from "react";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";

export function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') throw new Error("Permission denied");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error("Failed to start recording:", err);
      throw err;
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    if (!recordingRef.current) return null;

    setIsRecording(false);
    setIsTranscribing(true);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) return null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      return uri;
    } catch (err) {
      console.error("Failed to stop recording:", err);
      throw err;
    } finally {
      setIsTranscribing(false);
    }
  };

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
  };
}