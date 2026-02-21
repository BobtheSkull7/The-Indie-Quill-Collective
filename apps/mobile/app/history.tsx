import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing } from '../constants/theme';
import { getTranscriptHistory } from '../services/api';
import * as SecureStore from 'expo-secure-store';

interface TranscriptItem {
  id: number;
  content: string;
  source_type: string;
  created_at: string;
  word_count: number;
}

export default function HistoryScreen() {
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<number | null>(null);

  useEffect(() => {
    loadTranscripts();
  }, []);

  const loadTranscripts = async () => {
    try {
      const scribeId = await SecureStore.getItemAsync('scribe_id');
      if (!scribeId) return;

      const result = await getTranscriptHistory(scribeId);
      if (result.success && result.transcripts) {
        const items = result.transcripts.map((t) => ({
          ...t,
          word_count: t.content.trim().split(/\s+/).filter(Boolean).length,
        }));
        setTranscripts(items);
      }
    } catch (error) {
      console.error('Failed to load transcripts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = (item: TranscriptItem) => {
    if (playingId === item.id) {
      Speech.stop();
      setPlayingId(null);
      return;
    }
    setPlayingId(item.id);
    Speech.speak(item.content, {
      language: 'en-US',
      rate: 0.9,
      onDone: () => setPlayingId(null),
      onError: () => setPlayingId(null),
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: TranscriptItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{item.word_count} words</Text>
        </View>
      </View>
      <Text style={styles.cardContent} numberOfLines={3}>
        {item.content}
      </Text>
      <TouchableOpacity style={styles.playRow} onPress={() => handlePlay(item)}>
        <Ionicons
          name={playingId === item.id ? 'stop-circle' : 'play-circle'}
          size={28}
          color={Colors.primary}
        />
        <Text style={styles.playText}>
          {playingId === item.id ? 'Stop' : 'Listen'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recording History</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : transcripts.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Recordings Yet</Text>
          <Text style={styles.emptyText}>
            Your transcribed recordings will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={transcripts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
  },
  emptyText: {
    fontSize: Fonts.sizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardDate: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
  },
  cardBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cardBadgeText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.primary,
    fontWeight: Fonts.weights.semibold,
  },
  cardContent: {
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  playRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  playText: {
    fontSize: Fonts.sizes.md,
    color: Colors.primary,
    fontWeight: Fonts.weights.semibold,
  },
});
