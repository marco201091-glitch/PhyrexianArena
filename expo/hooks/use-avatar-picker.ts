import * as ImagePicker from 'expo-image-picker';
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useAvatarVersion } from '@/contexts/avatar-version-context';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/contexts/toast-context';
import { hapticSuccess } from '@/lib/haptics';
import { getSupabaseErrorMessage } from '@/lib/supabase-errors';

type UseAvatarPickerOptions = {
  uploadAvatar: (uri: string, mimeType: string) => Promise<void>;
};

export function useAvatarPicker({ uploadAvatar }: UseAvatarPickerOptions) {
  const { copy } = useLanguage();
  const { showToast } = useToast();
  const { bumpAvatarVersion } = useAvatarVersion();

  const pickAvatar = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(copy('error'), copy('uploadAvatarFailed'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    try {
      await uploadAvatar(asset.uri, asset.mimeType || 'image/jpeg');
      bumpAvatarVersion();
      void hapticSuccess();
      showToast(copy('avatarUpdated'));
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'INVALID_IMAGE_FORMAT') {
        Alert.alert(copy('error'), copy('invalidImageFormat'));
        return;
      }
      if (message === 'IMAGE_TOO_LARGE') {
        Alert.alert(copy('error'), copy('imageTooLarge'));
        return;
      }
      Alert.alert(copy('error'), getSupabaseErrorMessage(error, copy('uploadAvatarFailed')));
    }
  }, [bumpAvatarVersion, copy, showToast, uploadAvatar]);

  return { pickAvatar };
}