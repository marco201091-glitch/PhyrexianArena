import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader } from '@/components/ui/loader';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { useLanguage } from '@/contexts/language-context';

import { hapticSuccess } from '@/lib/haptics';
import { fetchGroupByInviteCode, type GroupInvitePreview } from '@/lib/join-arena';
import { getSupabaseErrorMessage } from '@/lib/supabase-errors';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/constants/theme';

export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const inviteCode = Array.isArray(code) ? code[0] : code;
  const { user, loading: authLoading } = useAuth();
  const { copy } = useLanguage();
  const { showToast } = useToast();
  const router = useRouter();
  const [group, setGroup] = useState<GroupInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadGroup = async () => {
      if (!inviteCode) {
        setLoading(false);
        return;
      }

      try {
        const preview = await fetchGroupByInviteCode(supabase, inviteCode);
        setGroup(preview);
      } catch (error) {
        setLoadError(getSupabaseErrorMessage(error, copy('invalidInviteBody')));
      } finally {
        setLoading(false);
      }
    };

    void loadGroup();
  }, [copy, inviteCode]);

  const handleJoin = useCallback(async () => {
    if (!user || !group) return;

    setJoining(true);
    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
        });

      if (error && error.code !== '23505') {
        throw error;
      }

      void hapticSuccess();
      showToast(copy('joinedArenaBody'));
      router.replace({ pathname: '/table/[id]', params: { id: group.id } });
    } catch (error) {
      Alert.alert(copy('error'), getSupabaseErrorMessage(error, copy('joinArenaFailed')));
    } finally {
      setJoining(false);
    }
  }, [copy, group, router, showToast, user]);

  if (loading || authLoading) {
    return <Loader label={copy('loading')} />;
  }

  if (!group) {
    return (
      <Screen safeBottom padded={false}>
        <EmptyState
          icon="link-outline"
          title={copy('invalidInvite')}
          body={loadError || copy('invalidInviteBody')}
          actionLabel={copy('goToDashboard')}
          onAction={() => router.replace('/(tabs)')}
          style={styles.empty}
        />
      </Screen>
    );
  }

  if (!user) {
    const redirect = `/join/${inviteCode}`;
    return (
      <Screen safeBottom padded={false}>
        <PhyrexianPanel variant="strong" style={styles.card}>
          <Text style={styles.appName}>{copy('appName')}</Text>
          <Text style={styles.title}>{copy('joinArenaName')} {group.name}</Text>
          <Text style={styles.body}>
            {group.description || copy('joinInviteHint')}
          </Text>
          <Text style={styles.hint}>{copy('signInToJoin')}</Text>
          <Button
            label={copy('login')}
            variant="ghost"
            onPress={() => router.push({ pathname: '/(auth)/login', params: { redirect } })}
          />
          <Button
            label={copy('register')}
            onPress={() => router.push({ pathname: '/(auth)/register', params: { redirect } })}
          />
        </PhyrexianPanel>
      </Screen>
    );
  }

  return (
    <Screen safeBottom padded={false}>
      <PhyrexianPanel variant="strong" style={styles.card}>
        <Text style={styles.title}>{copy('joinArenaName')} {group.name}</Text>
        <Text style={styles.body}>
          {group.description || copy('joinInviteHint')}
        </Text>
        <Text style={styles.hint}>{copy('confirmJoinHint')}</Text>
        <Button
          label={joining ? copy('joiningArena') : copy('joinArena')}
          disabled={joining}
          onPress={() => void handleJoin()}
        />
        <Button
          label={copy('cancel')}
          variant="ghost"
          onPress={() => router.replace('/(tabs)')}
        />
      </PhyrexianPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    margin: spacing.lg,
  },
  card: {
    margin: spacing.lg,
    gap: spacing.md,
    alignItems: 'stretch',
  },
  appName: {
    color: colors.primaryMuted,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  title: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
});