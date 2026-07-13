import { PropsWithChildren, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/ui/app-background';
import { useAuth } from '@/contexts/auth-context';
import { colors, spacing } from '@/constants/theme';
import { keyboardAvoidingBehavior, keyboardAvoidingEnabled } from '@/lib/keyboard';
import { contentPadding, resolveSafeAreaEdges } from '@/lib/layout';

type ScreenBackground = 'artwork' | 'solid' | 'auto';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
  background?: ScreenBackground;
  /** Include bottom safe-area inset (stack screens without tab bar). Auth solid screens default to true. */
  safeBottom?: boolean;
  keyboardAvoiding?: boolean;
}>;

function resolveBackground(
  preference: ScreenBackground,
  user: ReturnType<typeof useAuth>['user'],
  loading: boolean,
): 'artwork' | 'solid' {
  if (preference === 'artwork') return 'artwork';
  if (preference === 'solid') return 'solid';
  if (user || loading) return 'artwork';
  return 'solid';
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  background = 'auto',
  safeBottom,
  keyboardAvoiding,
}: ScreenProps) {
  const { user, loading } = useAuth();
  const resolvedBackground = resolveBackground(background, user, loading);
  const resolvedSafeBottom = safeBottom ?? background === 'solid';
  const resolvedKeyboardAvoiding = keyboardAvoidingEnabled && (keyboardAvoiding ?? scroll);
  const edges = resolveSafeAreaEdges(resolvedSafeBottom);
  const { width } = useWindowDimensions();
  const horizontalPadding = useMemo(() => contentPadding(width), [width]);
  const paddedStyle = useMemo(
    () => ({ paddingHorizontal: horizontalPadding, paddingTop: horizontalPadding }),
    [horizontalPadding],
  );

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, padded && paddedStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, padded && paddedStyle]}>{children}</View>
  );

  const body = (
    <SafeAreaView style={styles.safe} edges={edges}>
      {content}
    </SafeAreaView>
  );

  const wrappedBody = resolvedKeyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={keyboardAvoidingBehavior}
      keyboardVerticalOffset={4}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  if (resolvedBackground === 'solid') {
    return <View style={styles.solid}>{wrappedBody}</View>;
  }

  return <AppBackground>{wrappedBody}</AppBackground>;
}

const styles = StyleSheet.create({
  solid: {
    flex: 1,
    backgroundColor: colors.black,
  },
  keyboardAvoid: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxxl,
  },
  content: {
    flex: 1,
  },
});