import { useCallback } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { showAppAlert } from '@/lib/app-alert';

type UseAvatarPickerOptions = {
  uploadAvatar: (uri: string, mimeType: string) => Promise<void>;
};

export function useAvatarPicker(_options: UseAvatarPickerOptions) {
  const { copy } = useLanguage();

  const pickAvatar = useCallback(async () => {
    showAppAlert(copy('error'), copy('uploadAvatarFailed'));
  }, [copy]);

  return { pickAvatar };
}
