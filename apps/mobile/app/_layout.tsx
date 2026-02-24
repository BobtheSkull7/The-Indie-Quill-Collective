import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useNavigationContainerRef } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    const resetSession = async () => {
      await SecureStore.deleteItemAsync('scribe_id');
      await SecureStore.deleteItemAsync('scribe_name');
      await SecureStore.deleteItemAsync('ai_consent');
      setIsReady(true);

      if (navigationRef.isReady()) {
        router.replace('/');
      }
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
        initialRouteName="index"
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="recorder" />
        <Stack.Screen name="history" />
      </Stack>
    </>
  );
}
