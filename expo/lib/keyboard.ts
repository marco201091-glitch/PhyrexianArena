import { Platform, type KeyboardAvoidingViewProps } from 'react-native';

/** Android uses app.json softwareKeyboardLayoutMode: resize — avoid double layout shifts. */
export const keyboardAvoidingEnabled = Platform.OS === 'ios';

export const keyboardAvoidingBehavior: KeyboardAvoidingViewProps['behavior'] =
  Platform.OS === 'ios' ? 'padding' : undefined;