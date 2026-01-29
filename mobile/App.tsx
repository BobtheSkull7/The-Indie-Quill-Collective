import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet } from "react-native";
import { KeypadScreen } from "./src/screens/KeypadScreen";
import { RecordingScreen } from "./src/screens/RecordingScreen";
import { User } from "./src/types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {user ? (
        <RecordingScreen user={user} onLogout={handleLogout} />
      ) : (
        <KeypadScreen onLogin={handleLogin} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
});
