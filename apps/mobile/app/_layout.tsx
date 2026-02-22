import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const resetSession = async () => {
      await SecureStore.deleteItemAsync('scribe_id');
      await SecureStore.deleteItemAsync('scribe_name');
      setIsReady(true);
    };
    resetSession();
  }, []);

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="recorder" />
        <Stack.Screen name="history" />
      </Stack>
    </>
  );
}
