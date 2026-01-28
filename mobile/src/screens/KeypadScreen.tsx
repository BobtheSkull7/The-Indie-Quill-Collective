import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { verifyVibeId } from "../api";
import { User } from "../types";

interface Props {
  onLogin: (user: User) => void;
}

export function KeypadScreen({ onLogin }: Props) {
  const [vibeId, setVibeId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const formatVibeId = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    if (digits.length > 3) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    return digits;
  };

  const handleKeyPress = async (digit: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentDigits = vibeId.replace("-", "");
    if (currentDigits.length < 6) {
      setVibeId(formatVibeId(currentDigits + digit));
    }
  };

  const handleBackspace = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const digits = vibeId.replace("-", "");
    if (digits.length > 0) {
      setVibeId(formatVibeId(digits.slice(0, -1)));
    }
  };

  const handleClear = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVibeId("");
    setError("");
  };

  useEffect(() => {
    const digits = vibeId.replace("-", "");
    if (digits.length === 6) {
      verifyId(vibeId);
    }
  }, [vibeId]);

  const verifyId = async (id: string) => {
    setLoading(true);
    setError("");
    try {
      const user = await verifyVibeId(id);
      if (user) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onLogin(user);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError("Author ID not found");
      }
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>VibeScribe</Text>
        <Text style={styles.subtitle}>Enter your Author ID</Text>

        <View style={styles.display}>
          <Text style={styles.displayText}>
            {vibeId || "___-___"}
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator color="#14b8a6" /> : null}

        <View style={styles.keypad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <TouchableOpacity
              key={digit}
              style={styles.key}
              onPress={() => handleKeyPress(String(digit))}
            >
              <Text style={styles.keyText}>{digit}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.keyAction} onPress={handleClear}>
            <Text style={styles.keyActionText}>CLR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.key}
            onPress={() => handleKeyPress("0")}
          >
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.key} onPress={handleBackspace}>
            <Text style={styles.keyText}>←</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#14b8a6",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#94a3b8",
    marginBottom: 32,
  },
  display: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    minWidth: 200,
    alignItems: "center",
  },
  displayText: {
    fontSize: 32,
    fontFamily: "monospace",
    color: "#fff",
    letterSpacing: 4,
  },
  error: {
    color: "#f87171",
    marginBottom: 16,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: 280,
    gap: 12,
  },
  key: {
    width: 80,
    height: 80,
    backgroundColor: "#334155",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  keyAction: {
    width: 80,
    height: 80,
    backgroundColor: "#7f1d1d",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  keyActionText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fca5a5",
  },
});
