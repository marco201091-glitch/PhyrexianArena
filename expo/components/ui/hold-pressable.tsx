import { useRef } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { hapticLight } from '@/lib/haptics';

type Props = Omit<PressableProps, 'onPress' | 'onLongPress'> & {
  onShort: () => void;
  onLong: () => void;
};

export function HoldPressable({ onShort, onLong, ...props }: Props) {
  const held = useRef(false);
  return <Pressable
    {...props}
    delayLongPress={500}
    onLongPress={() => {
      held.current = true;
      void hapticLight();
      onLong();
    }}
    onPress={() => {
      if (held.current) {
        held.current = false;
        return;
      }
      void hapticLight();
      onShort();
    }}
  />;
}
