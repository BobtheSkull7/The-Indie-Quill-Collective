import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { API_BASE_URL } from '../constants/config';

let recording: Audio.Recording | null = null;

export async function requestMicrophonePermission(): Promise<boolean> {
  const { status } = await Audio.requestPermissionsAsync();
  return status === 'granted';
}

export async function startRecording(): Promise<boolean> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording: newRecording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recording = newRecording;
    return true;
  } catch (error) {
    console.error('Failed to start recording:', error);
    return false;
  }
}

export async function stopRecording(): Promise<string | null> {
  if (!recording) return null;

  try {
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = recording.getURI();
    recording = null;
    return uri;
  } catch (error) {
    console.error('Failed to stop recording:', error);
    recording = null;
    return null;
  }
}

export async function transcribeAudio(audioUri: string): Promise<string | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    if (!fileInfo.exists) {
      console.error('Audio file does not exist');
      return null;
    }

    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    const response = await fetch(`${API_BASE_URL}/api/vibe/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.error('Transcription failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.transcript || null;
  } catch (error) {
    console.error('Transcription error:', error);
    return null;
  }
}

export async function playAudio(uri: string): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync({ uri });
    await sound.playAsync();
  } catch (error) {
    console.error('Playback error:', error);
  }
}
