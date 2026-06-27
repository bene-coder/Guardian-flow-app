/**
 * Socket.io client — single shared connection to the GuardianFlow backend.
 *
 * Lifecycle:
 *   connectSocket()   — call after login (or on app launch if already authed)
 *   disconnectSocket() — call on logout
 *
 * Subscriptions:
 *   on(event, handler)   — register a listener (returns an unsubscribe fn)
 *   emit(event, payload) — send to backend
 *
 * The backend emits: location-update, panic-alert, alert-updated,
 * vehicle-registered, vehicle-status-changed, geofence-created,
 * geofence-deleted, geofence-violation, dead-man-alert, bulk-sync,
 * initial-state, vehicle-history.
 */

import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from './client';

type Handler = (payload: any) => void;

let socket: Socket | null = null;
const listeners = new Map<string, Set<Handler>>();

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const url = getSocketUrl();
  socket = io(url, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    timeout: 10_000,
  });

  // Re-dispatch every event to our local listeners Map so the rest of the
  // app never has to deal with the raw socket object.
  const forward = (event: string) => (payload: any) => {
    const set = listeners.get(event);
    if (set) set.forEach((h) => h(payload));
  };

  const events = [
    'location-update',
    'panic-alert',
    'alert-updated',
    'vehicle-registered',
    'vehicle-status-changed',
    'geofence-created',
    'geofence-deleted',
    'geofence-violation',
    'dead-man-alert',
    'bulk-sync',
    'initial-state',
    'vehicle-history',
    'connect',
    'disconnect',
    'connect_error',
  ];
  events.forEach((e) => socket!.on(e, forward(e)));

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    listeners.clear();
  }
}

export function on(event: string, handler: Handler): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(handler);
  return () => {
    listeners.get(event)?.delete(handler);
  };
}

export function emit(event: string, payload?: any): void {
  if (!socket) {
    console.warn(`[socket] emit "${event}" called before connectSocket() — dropped.`);
    return;
  }
  socket.emit(event, payload);
}

export function isSocketConnected(): boolean {
  return !!socket?.connected;
}
