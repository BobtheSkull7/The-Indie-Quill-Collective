import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Colors, Fonts, Spacing } from '../constants/theme';
import { verifyScribeId } from '../services/api';

const { width } = Dimensions.get('window');
const KEYPAD_SIZE = Math.min(width * 0.8, 360);

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'DEL'],
];

export default function LoginScreen() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const formatCode = (raw: string) => {
    if (raw.length <= 3) return raw;
    return raw.slice(0, 3) + '-' + raw.slice(3);
  };

  const handleKeyPress = (key: string) => {
    if (key === 'DEL') {
      setCode((prev) => prev.slice(0, -1));
      return;
    }
    if (key === '' || code.length >= 6) return;
    const newCode = code + key;
    setCode(newCode);

    if (newCode.length === 6) {
      handleLogin(newCode);
    }
  };

  const handleLogin = async (scribeId: string) => {
    setIsLoading(true);
    const formatted = scribeId.slice(0, 3) + '-' + scribeId.slice(3);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    try {
      const result = await verifyScribeId(formatted);
      if (result.success) {
        await SecureStore.setItemAsync('scribe_id', formatted);
        if (result.data?.user?.firstName) {
          await SecureStore.setItemAsync('scribe_name', result.data.user.firstName);
        }
        router.replace('/recorder');
      } else {
        Alert.alert('Invalid ID', result.error || 'Scribe ID not found. Please check and try again.');
        setCode('');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to server. Please try again.');
      setCode('');
    } finally {
      setIsLoading(false);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>VS</Text>
        <Text style={styles.title}>VibeScribe</Text>
        <Text style={styles.subtitle}>Enter Your Scribe ID</Text>
      </View>

      <View style={styles.codeDisplay}>
        <Animated.Text style={[styles.codeText, { opacity: pulseAnim }]}>
          {code.length > 0 ? formatCode(code) : '_ _ _ - _ _ _'}
        </Animated.Text>
        <View style={styles.dots}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < code.length && styles.dotFilled,
                i === 3 && styles.dotSpacer,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.keypad}>
        {KEYS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => (
              <TouchableOpacity
                key={key || 'empty'}
                style={[
                  styles.key,
                  key === '' && styles.keyEmpty,
                  key === 'DEL' && styles.keyDel,
                ]}
                onPress={() => handleKeyPress(key)}
                disabled={key === '' || isLoading}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.keyText,
                    key === 'DEL' && styles.keyDelText,
                  ]}
                >
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <Text style={styles.footer}>The Indie Quill Collective</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xxl,
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 40,
    fontWeight: Fonts.weights.extrabold,
    color: Colors.primary,
    letterSpacing: 4,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.bold,
    color: Colors.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  codeDisplay: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  codeText: {
    fontSize: Fonts.sizes.giant,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary,
    letterSpacing: 8,
    fontVariant: ['tabular-nums'],
  },
  dots: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dotSpacer: {
    marginLeft: Spacing.md,
  },
  keypad: {
    width: KEYPAD_SIZE,
    gap: Spacing.sm,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  key: {
    width: KEYPAD_SIZE / 3 - Spacing.sm,
    height: KEYPAD_SIZE / 3 - Spacing.sm,
    borderRadius: 16,
    backgroundColor: Colors.keypadButton,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  keyEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  keyDel: {
    backgroundColor: Colors.surfaceLight,
  },
  keyText: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.semibold,
    color: Colors.text,
  },
  keyDelText: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
  },
  footer: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
});
