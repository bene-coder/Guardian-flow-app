/**
 * Auth store — local-only session (the backend has no auth endpoint yet).
 *
 * On first launch the user picks a role + driver identity on the login
 * screen; we persist a flag so subsequent launches skip login. Real auth
 * (Supabase OTP, JWT, etc.) can be slotted in later by replacing the body
 * of `login` / `logout`.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Role } from './settings';

interface AuthState {
  isAuthed: boolean;
  role: Role;
  login: (role: Role) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      isAuthed: false,
      role: 'driver',
      login: (role) => set({ isAuthed: true, role }),
      logout: () => set({ isAuthed: false }),
    }),
    {
      name: 'gf-auth',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
