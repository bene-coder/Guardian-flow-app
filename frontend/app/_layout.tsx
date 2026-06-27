/**
 * Root layout — runs on app launch.
 *
 * 1. Initializes SecureStore-backed backend URL.
 * 2. Decides between (auth) login flow and (tabs) main flow.
 * 3. Wires up the global socket connection + tracking once authed.
 */

import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';

import { initBackendUrl } from '@/api/client';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { useSocketSync } from '@/hooks/useSocketSync';
import { useTracking } from '@/hooks/useTracking';
import { colors } from '@/theme';

export {
  // ErrorBoundary lives at the route level
} from 'expo-router';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const isAuthed = useAuth((s) => s.isAuthed);

  useEffect(() => {
    (async () => {
      await initBackendUrl();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          {isAuthed ? (
            <>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="panic"
                options={{
                  presentation: 'fullScreenModal',
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen name="vehicle/[id]" />
            </>
          ) : (
            <Stack.Screen name="auth/login" />
          )}
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Inner hook used by the (tabs) layout — wires socket + tracking + role sync. */
export function useAppShell() {
  const isAuthed = useAuth((s) => s.isAuthed);
  useSocketSync(isAuthed);
  useTracking();
  const setRole = useSettings((s) => s.setRole);
  const authRole = useAuth((s) => s.role);
  useEffect(() => {
    if (isAuthed) setRole(authRole);
  }, [isAuthed, authRole, setRole]);
}
