import { PropsWithChildren, useEffect, useState, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
}>;

export function Modal({
  visible,
  onClose,
  children,
  scroll = true,
  footer,
}: ModalProps) {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  const androidKeyboardPadding = Platform.OS === 'android' ? Math.max(0, keyboardHeight - insets.bottom) : 0;

  const panel = (
    <View style={styles.wrapper}>
      <PhyrexianPanel variant="modal" style={styles.card} padded={scroll}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            bounces={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.body}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </PhyrexianPanel>
    </View>
  );

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.root, { paddingTop: Math.max(insets.top, spacing.md) }]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheetHost,
            {
              paddingBottom: Math.max(insets.bottom, spacing.md) + androidKeyboardPadding,
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.modalOverlay,
  },
  sheetHost: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    maxHeight: '94%',
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
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xs,
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