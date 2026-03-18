import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Suspense, useCallback, useEffect, useState } from 'react';
import 'react-native-reanimated';

import { migrateDbIfNeeded } from '@/src/db/migrate';
import { ActiveFairDayBanner } from '@/src/shared/fair-day/ActiveFairDayBanner';
import { FairDayModeProvider } from '@/src/shared/fair-day/FairDayModeProvider';
import { LoadingView } from '@/src/shared/components/LoadingView';
import { lightNavigationTheme } from '@/src/shared/theme/navigationTheme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isClientReady, setIsClientReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    SplashScreen.hideAsync();
    setIsClientReady(true);
  }, []);

  if (!isClientReady) {
    return (
      <ThemeProvider value={lightNavigationTheme}>
        <LoadingView label="App voorbereiden..." />
      </ThemeProvider>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <ThemeProvider value={lightNavigationTheme}>
        <WebSQLiteProvider>
          <FairDayModeProvider>
            <View style={{ flex: 1 }}>
              <ActiveFairDayBanner />
              <View style={{ flex: 1 }}>
                <Stack screenOptions={{ contentStyle: { backgroundColor: '#F6F1E8' } }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack>
              </View>
            </View>
          </FairDayModeProvider>
        </WebSQLiteProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={lightNavigationTheme}>
      <Suspense fallback={<LoadingView label="App voorbereiden..." />}>
        <SQLiteProvider
          databaseName="beursmanager.db"
          onInit={migrateDbIfNeeded}
          options={{ enableChangeListener: true }}
          useSuspense>
          <FairDayModeProvider>
            <View style={{ flex: 1 }}>
              <ActiveFairDayBanner />
              <View style={{ flex: 1 }}>
                <Stack screenOptions={{ contentStyle: { backgroundColor: '#F6F1E8' } }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack>
              </View>
            </View>
          </FairDayModeProvider>
        </SQLiteProvider>
      </Suspense>
    </ThemeProvider>
  );
}

function WebSQLiteProvider({ children }: { children: React.ReactNode }) {
  const [dbError, setDbError] = useState<string | null>(null);

  const handleError = useCallback((error: Error) => {
    if (error.name === 'NoModificationAllowedError' || error.message.includes('No modification allowed')) {
      setDbError(
        'De app kan niet starten omdat een ander tabblad actief is. ' +
        'Sluit andere tabbladen met deze app en klik hieronder om opnieuw te laden.'
      );
    } else {
      setDbError(`Er ging iets mis: ${error.message}`);
    }
  }, []);

  if (dbError) {
    return (
      <View style={errorStyles.container}>
        <Text style={errorStyles.title}>App kan niet starten</Text>
        <Text style={errorStyles.message}>{dbError}</Text>
        <Pressable style={errorStyles.button} onPress={() => window.location.reload()}>
          <Text style={errorStyles.buttonText}>Opnieuw laden</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SQLiteProvider
      databaseName="beursmanager.db"
      onInit={migrateDbIfNeeded}
      options={{ enableChangeListener: true }}
      onError={handleError}>
      {children}
    </SQLiteProvider>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F6F1E8',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A3728',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#6B5B4F',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 400,
  },
  button: {
    backgroundColor: '#8A6A45',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
