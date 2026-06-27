import { ExpoConfig, ConfigContext } from '@expo/config';

// Google Maps API key — set in your .env or environment when building.
// For local dev you can leave it blank; the map will fall back to a
// styled placeholder so the rest of the UI is still demoable.
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'GuardianFlow',
  slug: 'guardianflow',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'guardianflow',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'cover',
    backgroundColor: '#0A0E1A',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.guardianflow.app',
    config: {
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'GuardianFlow needs your location to broadcast your vehicle position and trigger safety alerts.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'GuardianFlow needs background location to keep your vehicle tracked even when the app is closed, for your safety.',
      NSLocationAlwaysUsageDescription:
        'GuardianFlow needs background location to keep your vehicle tracked even when the app is closed, for your safety.',
    },
  },
  android: {
    package: 'com.guardianflow.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0A0E1A',
    },
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
      'POST_NOTIFICATIONS',
      'VIBRATE',
    ],
    config: {
      googleMaps: {
        apiKey: GOOGLE_MAPS_API_KEY,
      },
    },
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'GuardianFlow needs background location to keep your vehicle tracked even when the app is closed, for your safety.',
        locationAlwaysPermission:
          'GuardianFlow needs background location to keep your vehicle tracked even when the app is closed, for your safety.',
        locationWhenInUsePermission:
          'GuardianFlow needs your location to broadcast your vehicle position and trigger safety alerts.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          // react-native-maps needs Play Services; this keeps Gradle happy.
          minSdkVersion: 23,
        },
        ios: {
          useFrameworks: 'static',
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    eas: {
      projectId: 'guardianflow',
    },
  },
});
