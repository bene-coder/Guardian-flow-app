/**
 * HTTP client — Axios instance with a runtime-configurable base URL.
 *
 * The base URL is stored in SecureStore (set from the Settings screen) so
 * the user can point the app at any GuardianFlow backend without rebuilding.
 * On first launch we fall back to EXPO_PUBLIC_BACKEND_URL (set at build time
 * via .env), which defaults to http://10.0.2.2:3000 — the Android emulator's
 * way of reaching the host machine's localhost:3000.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BACKEND_URL_KEY = 'gf_backend_url';
const FALLBACK_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

let currentBaseUrl = FALLBACK_URL;
let client: AxiosInstance = createClient(FALLBACK_URL);

function createClient(baseUrl: string): AxiosInstance {
  const c = axios.create({
    baseURL: baseUrl,
    timeout: 12_000,
    headers: { 'Content-Type': 'application/json' },
  });
  // Attach a response logger so we can surface network errors usefully.
  c.interceptors.response.use(
    (res) => res,
    (error: AxiosError) => {
      const status = error.response?.status;
      const url = error.config?.url;
      const method = error.config?.method?.toUpperCase();
      console.warn(`[HTTP ${status || 'NET'}] ${method} ${url}`, error.message);
      return Promise.reject(error);
    },
  );
  return c;
}

export async function initBackendUrl(): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync(BACKEND_URL_KEY);
    if (stored) {
      currentBaseUrl = stored;
      client = createClient(stored);
    }
  } catch (e) {
    // SecureStore may be unavailable in Expo Go on web — fall back silently.
    console.warn('SecureStore unavailable, using fallback URL', e);
  }
  return currentBaseUrl;
}

export async function setBackendUrl(url: string): Promise<void> {
  const cleaned = url.trim().replace(/\/+$/, ''); // strip trailing slashes
  currentBaseUrl = cleaned;
  client = createClient(cleaned);
  try {
    await SecureStore.setItemAsync(BACKEND_URL_KEY, cleaned);
  } catch (e) {
    console.warn('Could not persist backend URL', e);
  }
}

export function getBackendUrl(): string {
  return currentBaseUrl;
}

export function getSocketUrl(): string {
  // Socket.io should connect to the same root as the REST API.
  return currentBaseUrl;
}

export function http(): AxiosInstance {
  return client;
}

/** Quick liveness probe — used by Settings screen + connection indicator. */
export async function pingBackend(): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const res = await client.get('/api/health', { timeout: 5_000 });
    return { ok: true, data: res.data };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}
