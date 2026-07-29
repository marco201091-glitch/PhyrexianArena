import { PropsWithChildren, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { AppBackground } from '@/components/ui/app-background';
import { useAuth } from '@/contexts/auth-context';
import { colors, spacing } from '@/constants/theme';
import { contentPadding, resolveSafeAreaEdges, screenContentMaxWidth } from '@/lib/layout';

type ScreenBackground = 'artwork' | 'solid' | 'auto';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
  background?: ScreenBackground;
  /** Include bottom safe-area inset (stack screens without tab bar). Auth solid screens default to true. */
  safeBottom?: boolean;
  keyboardAvoiding?: boolean;
  /** Constrain wide web/tablet layouts while keeping phones edge-to-edge. */
  maxWidth?: number;
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
  maxWidth,
}: ScreenProps) {
  const { user, loading } = useAuth();
  const resolvedBackground = resolveBackground(background, user, loading);
  const resolvedSafeBottom = safeBottom ?? background === 'solid';
  const edges = resolveSafeAreaEdges(resolvedSafeBottom);
  const { width } = useWindowDimensions();
  const horizontalPadding = useMemo(() => contentPadding(width), [width]);
  const resolvedMaxWidth = maxWidth ?? screenContentMaxWidth(resolvedBackground);
  const paddedStyle = useMemo(
    () => ({
      width: '100%' as const,
      maxWidth: resolvedMaxWidth,
      alignSelf: 'center' as const,
      paddingHorizontal: padded ? horizontalPadding : 0,
      paddingTop: padded ? horizontalPadding : 0,
    }),
    [horizontalPadding, padded, resolvedMaxWidth],
  );

  const scrollProps = {
    contentContainerStyle: [styles.scrollContent, paddedStyle],
    keyboardShouldPersistTaps: 'handled' as const,
    keyboardDismissMode: 'on-drag' as const,
    showsVerticalScrollIndicator: false,
  };

  const content = scroll && keyboardAvoiding ? (
    <ScrollView {...scrollProps}>
      {children}
    </ScrollView>
  ) : scroll ? (
    <KeyboardAwareScrollView
      {...scrollProps}
      bottomOffset={spacing.lg}
    >
      {children}
    </KeyboardAwareScrollView>
  ) : (
    <View style={[styles.content, paddedStyle]}>{children}</View>
  );

  const safeContent = (
    <SafeAreaView style={styles.safe} edges={edges}>
      {content}
    </SafeAreaView>
  );

  const wrappedBody = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {safeContent}
    </KeyboardAvoidingView>
  ) : safeContent;

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
