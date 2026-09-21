import { useRef } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { hapticLight } from '@/lib/haptics';

// Long-press targets are compact counters and seats. A little slop keeps a
// slightly-off tap from being swallowed, without reaching a neighbouring
// control. Callers can override it.
const DEFAULT_HIT_SLOP = 6;

type Props = Omit<PressableProps, 'onPress' | 'onLongPress'> & {
  onShort: () => void;
  onLong: () => void;
};

export function HoldPressable({ onShort, onLong, ...props }: Props) {
  const held = useRef(false);
  return <Pressable
    {...props}
    hitSlop={props.hitSlop ?? DEFAULT_HIT_SLOP}
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
