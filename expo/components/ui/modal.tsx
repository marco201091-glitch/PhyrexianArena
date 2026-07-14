import { PropsWithChildren, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing } from '@/constants/theme';
import { keyboardAvoidingBehavior, keyboardAvoidingEnabled } from '@/lib/keyboard';

type ModalProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  /** When false, children manage their own scroll (use with footer). */
  scroll?: boolean;
  footer?: ReactNode;
  /** Dialogs are centered and width-constrained; sheets stay anchored to the bottom. */
  presentation?: 'sheet' | 'dialog';
  maxWidth?: number;
}>;

export function Modal({
  visible,
  onClose,
  children,
  scroll = true,
  footer,
  presentation = 'sheet',
  maxWidth = 560,
}: ModalProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDialog = presentation === 'dialog' || width >= 720;

  const panel = (
    <View style={styles.wrapper}>
      {!isDialog ? <View style={styles.sheetHandle} /> : null}
      <PhyrexianPanel variant="modal" style={styles.card} padded={false}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              footer ? styles.scrollWithFooter : styles.scrollStandalone,
            ]}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            bounces={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.body, footer ? styles.bodyWithFooter : styles.bodyStandalone]}>
            {children}
          </View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </PhyrexianPanel>
    </View>
  );

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={isDialog ? 'fade' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          styles.root,
          isDialog && styles.dialogRoot,
          { paddingTop: Math.max(insets.top, spacing.md) },
        ]}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheetHost,
            isDialog && styles.dialogHost,
            {
              paddingBottom: Math.max(insets.bottom, spacing.md),
              maxWidth: isDialog ? maxWidth : undefined,
            },
          ]}
        >
          {keyboardAvoidingEnabled ? (
            <KeyboardAvoidingView
              behavior={keyboardAvoidingBehavior}
              style={styles.keyboardAvoid}
              keyboardVerticalOffset={insets.top}
            >
              {panel}
            </KeyboardAvoidingView>
          ) : (
            panel
          )}
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dialogRoot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.modalOverlay,
  },
  sheetHost: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    maxHeight: '94%',
  },
  dialogHost: {
    alignSelf: 'center',
  },
  keyboardAvoid: {
    width: '100%',
    maxHeight: '100%',
  },
  wrapper: {
    width: '100%',
    maxHeight: '100%',
  },
  card: {
    maxHeight: '100%',
    overflow: 'hidden',
  },
  body: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: '100%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  bodyWithFooter: {
    paddingBottom: spacing.md,
  },
  bodyStandalone: {
    paddingBottom: spacing.lg,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  scrollWithFooter: {
    paddingBottom: spacing.md,
  },
  scrollStandalone: {
    paddingBottom: spacing.lg,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
});
