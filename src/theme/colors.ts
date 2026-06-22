/**
 * GuardianFlow — "Dark Safety" theme
 *
 * A dark navy canvas with neon-teal as the "guardian" accent and amber/red
 * for safety states. Designed to look like a security-ops console: high
 * contrast, calm in the dark, easy to read at night in a moving vehicle.
 */

export const colors = {
  // Canvas
  background: '#0A0E1A',
  surface: '#131826',
  surfaceElevated: '#1A2030',
  surfaceHover: '#222B3E',

  // Text
  text: '#F4F6FB',
  textSecondary: '#A0A9BD',
  textMuted: '#5C6680',

  // Brand
  primary: '#00E5C7',        // neon teal — safety / "guardian"
  primaryDim: '#00B89E',
  primaryGlow: 'rgba(0, 229, 199, 0.25)',

  // Status
  warning: '#FFB020',
  warningDim: '#3A2A0E',
  danger: '#FF4D6D',
  dangerDim: '#3A0E18',
  success: '#4ADE80',
  successDim: '#0E3A1F',
  info: '#60A5FA',
  infoDim: '#0E1F3A',

  // Borders
  border: '#232B3E',
  borderStrong: '#344057',
  overlay: 'rgba(10, 14, 26, 0.7)',

  // Map overlay (semi-transparent UI on top of the map)
  mapOverlayBg: 'rgba(19, 24, 38, 0.85)',
  mapOverlayBorder: 'rgba(0, 229, 199, 0.35)',

  // Map style — desaturated dark map for the dark-safety aesthetic
  // (used when no Google Maps API key is set, or as a custom style override)
  // NOTE: not `as const` — react-native-maps expects a mutable MapStyleElement[].
  mapDarkStyle: [
    { elementType: 'geometry', stylers: [{ color: '#0F1422' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#7C8699' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0F1422' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#A0A9BD' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#7C8699' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#13241F' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1A2030' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#222B3E' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1A2030' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0A1421' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3A5066' }] },
  ],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  // System font on both platforms — no extra fonts to load.
  fontFamily: 'System',
  fontFamilyMono: 'Menlo', // iOS; falls back to monospace on Android

  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    xxl: 28,
    giant: 38,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  lineHeight: {
    tight: 1.15,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  dangerGlow: {
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
} as const;

export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;
