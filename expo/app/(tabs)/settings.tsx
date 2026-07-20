import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAppAlert } from '@/lib/app-alert';
import { isPasswordPolicyValid, PasswordRequirements } from '@/components/auth/password-requirements';
import { Button } from '@/components/ui/button';
import { FilterChip } from '@/components/ui/filter-chip';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { SectionHeader } from '@/components/ui/section-header';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { useLanguage } from '@/contexts/language-context';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { ManaLogo } from '@/components/ui/mana-logo';
import { useAvatarVersion } from '@/contexts/avatar-version-context';
import { useAvatarPicker } from '@/hooks/use-avatar-picker';
import { useProfile } from '@/hooks/use-profile';
import type { AppLanguage } from '@/lib/i18n/types';
import { isGoogleAuthUser } from '@/lib/oauth-profile';
import { getProfileDisplayName } from '@/lib/profile-display';
import { getSupabaseErrorMessage } from '@/lib/supabase-errors';
import { supabase } from '@/lib/supabase';
import { hapticSuccess } from '@/lib/haptics';
import { APP_DISPLAY_VERSION } from '@/lib/app-version';
import { apiPost } from '@/lib/api';
import { colors, spacing } from '@/constants/theme';
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  loadAccessibilityPreferences,
  saveAccessibilityPreferences,
  type AccessibilityPreferences,
} from '@/lib/accessibility-preferences';

export default function SettingsScreen() {
  const { copy, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { version: avatarVersion } = useAvatarVersion();
  const { profile, updateDisplayName, uploadAvatar, getAvatarUrl } = useProfile(user?.id);
  const { pickAvatar } = useAvatarPicker({ uploadAvatar });
  const avatarUrl = getAvatarUrl(avatarVersion);
  const { showToast } = useToast();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [accessibility, setAccessibility] = useState<AccessibilityPreferences>(DEFAULT_ACCESSIBILITY_PREFERENCES);

  useEffect(() => {
    void loadAccessibilityPreferences().then(setAccessibility);
  }, []);

  const updateReducedMotion = (value: boolean) => {
    const next = { ...accessibility, reducedMotion: value };
    setAccessibility(next);
    void saveAccessibilityPreferences(next);
  };

  const languageOptions: { id: AppLanguage; label: string }[] = [
    { id: 'en', label: copy('english') },
    { id: 'it', label: copy('italian') },
  ];
  const currentLanguageLabel = languageOptions.find((option) => option.id === language)?.label ?? copy('language');

  const passwordsMatch = newPassword === confirmNewPassword && confirmNewPassword.length > 0;
  const canSavePassword = isPasswordPolicyValid(newPassword) && passwordsMatch && currentPassword.length > 0;
  const deleteNeedsPassword = !isGoogleAuthUser(user);
  const canDeleteAccount = deleteConfirmation.trim().length > 0;

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      showAppAlert(copy('error'), copy('unableToUpdatePassword'));
      return;
    }

    if (!passwordsMatch) {
      showAppAlert(copy('error'), copy('passwordsDoNotMatch'));
      return;
    }

    setSavingPassword(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        throw new Error(copy('currentPasswordIncorrect'));
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      resetPasswordForm();
      setShowPasswordModal(false);
      void hapticSuccess();
      showToast(copy('passwordChangedSuccess'));
    } catch (error) {
      showAppAlert(
        copy('error'),
        error instanceof Error ? error.message : getSupabaseErrorMessage(error, copy('unableToUpdatePassword')),
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const openEditName = () => {
    setDisplayNameDraft(profile?.display_name || '');
    setShowEditNameModal(true);
  };

  const handleSaveName = async () => {
    setSavingName(true);
    try {
      await updateDisplayName(displayNameDraft);
      setShowEditNameModal(false);
      void hapticSuccess();
      showToast(copy('profileUpdated'));
    } catch (error) {
      showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('updateProfileFailed')));
    } finally {
      setSavingName(false);
    }
  };

  const handleLanguageChange = async (nextLanguage: AppLanguage) => {
    await setLanguage(nextLanguage);
    setShowLanguageModal(false);
    void hapticSuccess();
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeletingAccount(true);
    try {
      const response = await apiPost<{ ok: true }>('/api/auth/delete-account', {
        password: deleteNeedsPassword ? deleteConfirmation : undefined,
        confirmation: deleteNeedsPassword ? undefined : deleteConfirmation,
      });

      if (response.error || response.status >= 400) {
        throw new Error(response.status === 403
          ? copy('accountConfirmationFailed')
          : copy('deleteAccountFailed'));
      }

      await supabase.auth.signOut({ scope: 'local' });
      setShowDeleteAccountModal(false);
      setDeleteConfirmation('');
      router.replace('/(auth)/login');
    } catch (error) {
      showAppAlert(
        copy('error'),
        error instanceof Error ? error.message : copy('deleteAccountFailed'),
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <Screen>
      <View style={styles.branding}>
        <ManaLogo
          size="md"
          showText
          layout="stacked"
          centered
          subtitle={copy('appSubtitle')}
        />
      </View>

      <PhyrexianPanel style={styles.card}>
        <SectionHeader title={copy('profile')} />
        <View style={styles.profileHeader}>
          <Pressable onPress={() => void pickAvatar()} style={styles.avatarButton}>
            <ProfileAvatar uri={avatarUrl} size="md" />
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={14} color={colors.foreground} />
            </View>
          </Pressable>
          <Text style={styles.displayName}>{getProfileDisplayName(profile)}</Text>
          {profile?.username ? (
            <Text style={styles.username}>@{profile.username}</Text>
          ) : null}
        </View>

        <View style={styles.profileActions}>
          <Button label={copy('uploadAvatar')} variant="ghost" onPress={() => void pickAvatar()} />
          <Button label={copy('editDisplayName')} variant="ghost" onPress={openEditName} />
          {!isGoogleAuthUser(user) ? (
            <Button
              label={copy('changePassword')}
              variant="ghost"
              onPress={() => {
                resetPasswordForm();
                setShowPasswordModal(true);
              }}
            />
          ) : null}
          <Button
            label={`${copy('language')} · ${currentLanguageLabel}`}
            variant="ghost"
            icon="language-outline"
            onPress={() => setShowLanguageModal(true)}
          />
        </View>
      </PhyrexianPanel>

      <PhyrexianPanel style={styles.card}>
        <SectionHeader title={copy('accessibility')} />
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceCopy}>
            <Text style={styles.preferenceLabel}>{copy('reducedMotion')}</Text>
            <Text style={styles.preferenceHint}>{copy('disabledByDefault')}</Text>
          </View>
          <Switch
            value={accessibility.reducedMotion}
            onValueChange={updateReducedMotion}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </PhyrexianPanel>

      <PhyrexianPanel style={styles.card}>
        <SectionHeader title={copy('legalDocuments')} />
        <Link href={{ pathname: '/legal/[slug]', params: { slug: 'privacy' } }} style={styles.legalLink}>{copy('privacyPolicy')}</Link>
        <Link href={{ pathname: '/legal/[slug]', params: { slug: 'terms' } }} style={styles.legalLink}>{copy('termsOfUse')}</Link>
        <Link href={{ pathname: '/legal/[slug]', params: { slug: 'cookies' } }} style={styles.legalLink}>{copy('cookiePolicy')}</Link>
      </PhyrexianPanel>

      <Button label={copy('logout')} variant="ghost" onPress={() => void signOut()} style={styles.logout} />
      <Button
        label={copy('deleteAccount')}
        variant="destructive"
        icon="trash-outline"
        onPress={() => {
          setDeleteConfirmation('');
          setShowDeleteAccountModal(true);
        }}
        style={styles.deleteAccount}
      />

      <Text style={styles.version}>
        {copy('appVersion')} {APP_DISPLAY_VERSION}
      </Text>

      <Modal visible={showLanguageModal} onClose={() => setShowLanguageModal(false)}>
        <Text style={styles.modalTitle}>{copy('language')}</Text>
        <View style={styles.languageRow}>
          {languageOptions.map((option) => (
            <FilterChip
              key={option.id}
              label={option.label}
              active={language === option.id}
              onPress={() => void handleLanguageChange(option.id)}
            />
          ))}
        </View>
        <Button
          label={copy('cancel')}
          variant="ghost"
          onPress={() => setShowLanguageModal(false)}
          style={styles.modalCancel}
        />
      </Modal>

      <Modal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)}>
        <Text style={styles.modalTitle}>{copy('changePassword')}</Text>
        <Input
          label={copy('currentPassword')}
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
          autoComplete="current-password"
        />
        <Input
          label={copy('newPassword')}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          autoComplete="new-password"
        />
        <PasswordRequirements password={newPassword} />
        <Input
          label={copy('confirmNewPassword')}
          secureTextEntry
          value={confirmNewPassword}
          onChangeText={setConfirmNewPassword}
          autoComplete="new-password"
        />
        {confirmNewPassword.length > 0 && !passwordsMatch ? (
          <Text style={styles.error}>{copy('passwordsDoNotMatch')}</Text>
        ) : null}
        <View style={styles.modalActions}>
          <Button
            label={copy('cancel')}
            variant="ghost"
            onPress={() => setShowPasswordModal(false)}
            style={styles.modalButton}
          />
          <Button
            label={savingPassword ? copy('saving') : copy('changePassword')}
            onPress={handleChangePassword}
            disabled={savingPassword || !canSavePassword}
            style={styles.modalButton}
          />
        </View>
      </Modal>

      <Modal visible={showEditNameModal} onClose={() => setShowEditNameModal(false)}>
        <Text style={styles.modalTitle}>{copy('editDisplayName')}</Text>
        <Input
          label={copy('displayName')}
          value={displayNameDraft}
          onChangeText={setDisplayNameDraft}
          placeholder={copy('displayNamePlaceholder')}
        />
        <View style={styles.modalActions}>
          <Button label={copy('cancel')} variant="ghost" onPress={() => setShowEditNameModal(false)} style={styles.modalButton} />
          <Button
            label={savingName ? copy('saving') : copy('save')}
            disabled={savingName}
            onPress={handleSaveName}
            style={styles.modalButton}
          />
        </View>
      </Modal>

      <Modal
        visible={showDeleteAccountModal}
        onClose={() => {
          if (!deletingAccount) setShowDeleteAccountModal(false);
        }}
      >
        <Text style={styles.modalTitle}>{copy('deleteAccountTitle')}</Text>
        <Text style={styles.deleteAccountHint}>{copy('deleteAccountHint')}</Text>
        <Input
          label={deleteNeedsPassword ? copy('currentPassword') : copy('confirmAccountEmail')}
          secureTextEntry={deleteNeedsPassword}
          autoCapitalize="none"
          keyboardType={deleteNeedsPassword ? 'default' : 'email-address'}
          value={deleteConfirmation}
          onChangeText={setDeleteConfirmation}
          autoComplete={deleteNeedsPassword ? 'current-password' : 'email'}
        />
        <View style={styles.modalActions}>
          <Button
            label={copy('cancel')}
            variant="ghost"
            disabled={deletingAccount}
            onPress={() => setShowDeleteAccountModal(false)}
            style={styles.modalButton}
          />
          <Button
            label={deletingAccount ? copy('deletingAccount') : copy('deleteAccount')}
            variant="destructive"
            disabled={deletingAccount || !canDeleteAccount}
            onPress={() => void handleDeleteAccount()}
            style={styles.modalButton}
          />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  branding: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  card: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  profileActions: {
    gap: spacing.sm,
  },
  avatarButton: {
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  displayName: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  username: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  languageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  legalLink: {
    color: colors.primaryLight,
    fontWeight: '600',
    fontSize: 15,
  },
  error: {
    color: colors.destructive,
    fontSize: 12,
  },
  logout: {
    marginTop: spacing.xs,
  },
  deleteAccount: {
    marginTop: spacing.sm,
  },
  deleteAccountHint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  version: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 12,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modalButton: {
    flex: 1,
  },
  modalCancel: {
    marginTop: spacing.xs,
  },
  preferenceRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  preferenceCopy: {
    flex: 1,
  },
  preferenceLabel: {
    color: colors.foreground,
    fontWeight: '700',
  },
  preferenceHint: {
    color: colors.muted,
    fontSize: 12,
  },
});
