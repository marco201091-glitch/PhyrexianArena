import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AppLanguage } from '@/lib/i18n/types';
import {
  readLanguagePreference,
  writeLanguagePreference,
  type LanguageStorageDriver,
} from '@/lib/language-storage-core';

function isServerRender() {
  return Platform.OS === 'web' && typeof window === 'undefined';
}

const webDriver: LanguageStorageDriver = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

const nativeDriver: LanguageStorageDriver = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export async function getStoredLanguage(): Promise<AppLanguage | null> {
  if (isServerRender()) return null;
  return readLanguagePreference(Platform.OS === 'web' ? webDriver : nativeDriver);
}

export async function setStoredLanguage(language: AppLanguage): Promise<void> {
  if (isServerRender()) return;
  await writeLanguagePreference(Platform.OS === 'web' ? webDriver : nativeDriver, language);
}

export {
  LANGUAGE_STORAGE_KEY,
  LEGACY_LANGUAGE_STORAGE_KEY,
  isAppLanguage,
  readLanguagePreference,
  writeLanguagePreference,
} from '@/lib/language-storage-core';
