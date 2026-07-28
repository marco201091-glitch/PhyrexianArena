import DateTimePicker from '@expo/ui/community/datetime-picker';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/input';
import { colors, radii, touch } from '@/constants/theme';
import { parseMatchDateValue, toMatchDateValue } from '@/lib/match-datetime';
import { layout } from '@/lib/layout';

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  testID?: string;
};

export function DateField({
  label,
  value,
  onChange,
  error,
  maximumDate,
  minimumDate,
  testID,
}: DateFieldProps) {
  const [androidPickerVisible, setAndroidPickerVisible] = useState(false);
  const selectedDate = useMemo(
    () => parseMatchDateValue(value) ?? new Date(),
    [value],
  );

  if (Platform.OS === 'web') {
    return (
      <Input
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        inputMode="numeric"
        error={error}
        testID={testID}
      />
    );
  }

  const picker = (
    <DateTimePicker
      value={selectedDate}
      mode="date"
      display={Platform.OS === 'ios' ? 'compact' : 'default'}
      presentation={Platform.OS === 'android' ? 'dialog' : 'inline'}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      accentColor={colors.primaryLight}
      themeVariant="dark"
      testID={testID ? `${testID}-native` : undefined}
      onValueChange={(_event, nextDate) => {
        onChange(toMatchDateValue(nextDate));
        setAndroidPickerVisible(false);
      }}
      onDismiss={() => setAndroidPickerVisible(false)}
    />
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label} maxFontSizeMultiplier={layout.maxFontSizeMultiplier}>
        {label}
      </Text>
      {Platform.OS === 'android' ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={value}
            testID={testID}
            style={({ pressed }) => [styles.field, pressed && styles.pressed, error && styles.errorField]}
            onPress={() => setAndroidPickerVisible(true)}
          >
            <Text style={styles.value} maxFontSizeMultiplier={layout.maxFontSizeMultiplier}>
              {value}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={colors.primaryLight} />
          </Pressable>
          {androidPickerVisible ? picker : null}
        </>
      ) : (
        <View style={[styles.field, error && styles.errorField]}>{picker}</View>
      )}
      {error ? (
        <Text style={styles.error} maxFontSizeMultiplier={layout.maxFontSizeMultiplier}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  field: {
    minHeight: touch.minHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.inputBg,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: {
    borderColor: colors.primaryLight,
  },
  errorField: {
    borderColor: colors.destructive,
  },
  value: {
    color: colors.foreground,
    fontSize: 16,
  },
  error: {
    color: colors.destructive,
    fontSize: 12,
  },
});
