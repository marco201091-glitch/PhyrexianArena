import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const REMEMBER_ME_STORAGE_KEY = 'phyrexian-remember-me';

const memoryStorage = new Map<string, string>();
let rememberMeEnabled = true;
let preferenceLoaded = false;

async function loadRememberMePreference() {
  if (preferenceLoaded) return;
  const stored = await SecureStore.getItemAsync(REMEMBER_ME_STORAGE_KEY);
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
  await SecureStore.setItemAsync(REMEMBER_ME_STORAGE_KEY, rememberMe ? 'true' : 'false');
  if (!rememberMe) {
    memoryStorage.clear();
  }
}

function isPkceVerifierKey(key: string) {
  return key.endsWith('-code-verifier');
}

function usesAsyncStorage(key: string) {
  // Supabase sessions exceed SecureStore's 2048-byte limit; PKCE verifier must survive OAuth.
  return rememberMeEnabled || isPkceVerifierKey(key);
}

export const authStorage = {
  getItem: async (key: string) => {
    await loadRememberMePreference();
    if (usesAsyncStorage(key)) {
      return AsyncStorage.getItem(key);
    }
    return memoryStorage.get(key) ?? null;
  },
  setItem: async (key: string, value: string) => {
    await loadRememberMePreference();
    if (usesAsyncStorage(key)) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    memoryStorage.set(key, value);
  },
  removeItem: async (key: string) => {
    await loadRememberMePreference();
    if (usesAsyncStorage(key)) {
      await AsyncStorage.removeItem(key);
      return;
    }
    memoryStorage.delete(key);
  },
};