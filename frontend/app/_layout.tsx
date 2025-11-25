import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen immediately since we're not loading custom fonts
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="admin-dashboard" />
      </Stack>
    </AuthProvider>
  );
}
