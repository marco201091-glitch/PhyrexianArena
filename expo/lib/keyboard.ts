import { Platform, type KeyboardAvoidingViewProps } from 'react-native';

export const keyboardAvoidingEnabled = true;

export const keyboardAvoidingBehavior: KeyboardAvoidingViewProps['behavior'] =
  Platform.OS === 'ios' ? 'padding' : 'height';
