import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const REMEMBER_ME_STORAGE_KEY = 'phyrexian-remember-me';

const memoryStorage = new Map<string, string>();
let rememberMeEnabled = true;
let preferenceLoaded = false;

function isServerRender() {
  return Platform.OS === 'web' && typeof window === 'undefined';
}

async function readPreference() {
  if (isServerRender()) return null;
  if (Platform.OS === 'web') return AsyncStorage.getItem(REMEMBER_ME_STORAGE_KEY);
  return SecureStore.getItemAsync(REMEMBER_ME_STORAGE_KEY);
}

async function writePreference(value: string) {
  if (isServerRender()) return;
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(REMEMBER_ME_STORAGE_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(REMEMBER_ME_STORAGE_KEY, value);
}

async function loadRememberMePreference() {
  if (preferenceLoaded) return;
  const stored = await readPreference();
  rememberMeEnabled = stored !== 'false';
  preferenceLoaded = true;
}

export async function getRememberMePreference() {
  await loadRememberMePreference();
  return rememberMeEnabled;
}

export async function setRememberMePreference(rememberMe: boolean) {
  rememberMeEnabled = rememberMe;
  preferenceLoaded = true;
  await writePreference(rememberMe ? 'true' : 'false');
  if (!rememberMe) {
    memoryStorage.clear();
  }
}

function isPkceVerifierKey(key: string) {
  return key.endsWith('-code-verifier');
}

function usesAsyncStorage(key: string) {
  // Supabase sessions exceed SecureStore's value limit. Keep recovery PKCE
  // verifiers durable as well so password-reset links can complete reliably.
  return rememberMeEnabled || isPkceVerifierKey(key);
}

export const authStorage = {
  getItem: async (key: string) => {
    await loadRememberMePreference();
    if (isServerRender()) return memoryStorage.get(key) ?? null;
    if (usesAsyncStorage(key)) {
      return AsyncStorage.getItem(key);
    }
    return memoryStorage.get(key) ?? null;
  },
  setItem: async (key: string, value: string) => {
    await loadRememberMePreference();
    if (isServerRender()) {
      memoryStorage.set(key, value);
      return;
    }
    if (usesAsyncStorage(key)) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    memoryStorage.set(key, value);
  },
  removeItem: async (key: string) => {
    await loadRememberMePreference();
    if (isServerRender()) {
      memoryStorage.delete(key);
      return;
    }
    if (usesAsyncStorage(key)) {
      await AsyncStorage.removeItem(key);
      return;
    }
    memoryStorage.delete(key);
  },
};
