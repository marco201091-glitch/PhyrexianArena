import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { colors, radii, spacing } from '@/constants/theme';
import { apiGet, apiPatch } from '@/lib/api';
import { isFdroidBuild } from '@/lib/env';

type Preferences = { arena_invite: boolean; arena_member_joined: boolean; match_completed: boolean; push_enabled: boolean };
const DEFAULTS: Preferences = { arena_invite: true, arena_member_joined: true, match_completed: true, push_enabled: true };
const PREFERENCE_ROWS = [
  ['arena_invite', 'arenaInviteNotifications'],
  ['arena_member_joined', 'memberJoinedNotifications'],
  ['match_completed', 'matchCompletedNotifications'],
] as const;

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const { copy } = useLanguage();
  const [preferences, setPreferences] = useState(DEFAULTS);

  const load = useCallback(async () => {
    if (!user) return;
    const result = await apiGet<{ preferences: Preferences }>('/api/notifications');
    if (result.status === 200 && result.data?.preferences) setPreferences(result.data.preferences);
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  const toggle = async (key: keyof Preferences) => {
    const previous = preferences;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    const result = await apiPatch('/api/notifications', { action: 'preferences', preferences: { [key]: next[key] } });
    if (result.status !== 200) setPreferences(previous);
  };

  return (
    <Screen>
      <Text style={styles.title}>{copy('notificationPreferences')}</Text>
      <View style={styles.card}>
        {PREFERENCE_ROWS.map(([key, label]) => (
          <View key={key} style={styles.preference}>
            <Text style={styles.label}>{copy(label)}</Text>
            <Switch value={preferences[key]} onValueChange={() => void toggle(key)} trackColor={{ true: colors.primary, false: colors.surfaceMuted }} />
          </View>
        ))}
        {!isFdroidBuild() ? (
          <View style={styles.preference}>
            <Text style={styles.label}>{copy('pushNotifications')}</Text>
            <Switch value={preferences.push_enabled} onValueChange={() => void toggle('push_enabled')} trackColor={{ true: colors.primary, false: colors.surfaceMuted }} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.foreground, fontSize: 28, fontWeight: '800', marginBottom: spacing.lg },
  card: { borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.card, padding: spacing.md },
  preference: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  label: { flex: 1, color: colors.foreground },
});
