import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeckImage } from '@/components/deck/deck-image';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { colors } from '@/constants/theme';
import { useCommanderArts } from '@/hooks/use-commander-arts';
import {
  filterSelectableCommanderOptions,
  resolveSelectedCommanderOption,
  type CommanderMetadataOption,
} from '@/lib/deck-metadata';
import type { ProfileDeck } from '@/lib/types/profile';

type EditDeckModalProps = {
  visible: boolean;
  saving: boolean;
  deck: ProfileDeck | null;
  commanderOptions: CommanderMetadataOption[];
  labels: {
    title: string;
    commanderToDisplay: string;
    chooseCommanderArt: string;
    loadingArts: string;
    noArtsFound: string;
    printing: string;
    saveSelectedCommander: string;
    close: string;
    saving: string;
  };
  onClose: () => void;
  onLoadOptions: (deck: ProfileDeck) => Promise<CommanderMetadataOption[]>;
  onSave: (input: {
    commander: string;
    commanderImage: string | null;
    commanderOptions: CommanderMetadataOption[];
  }) => Promise<void>;
};

export function EditDeckModal({
  visible,
  saving,
  deck,
  commanderOptions,
  labels,
  onClose,
  onLoadOptions,
  onSave,
}: EditDeckModalProps) {
  const [options, setOptions] = useState<CommanderMetadataOption[]>([]);
  const [selectedCommander, setSelectedCommander] = useState<CommanderMetadataOption | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const { arts, loading: loadingArts } = useCommanderArts(
    selectedCommander?.name || deck?.commander || null,
  );

  useEffect(() => {
    if (!visible || !deck) return;

    setLoadingOptions(true);
    void (async () => {
      const loaded = filterSelectableCommanderOptions(
        commanderOptions.length > 0
          ? commanderOptions
          : await onLoadOptions(deck),
      );
      setOptions(loaded);
      setSelectedCommander(resolveSelectedCommanderOption(
        loaded,
        deck.commander,
        deck.commander_image,
      ));
      setLoadingOptions(false);
    })();
  }, [visible, deck, commanderOptions, onLoadOptions]);

  if (!deck) return null;

  const activeImage = selectedCommander?.imageUrl ?? deck.commander_image;

  const handleSavePresentation = async (commanderName: string, imageUrl: string | null) => {
    await onSave({
      commander: commanderName,
      commanderImage: imageUrl,
      commanderOptions: options,
    });
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="always" keyboardDismissMode="none">
        <Text style={styles.title}>{labels.title}</Text>
        <Text style={styles.deckName}>{deck.name}</Text>

        {loadingOptions ? (
          <View style={styles.searchingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null}

        {options.length > 1 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{labels.commanderToDisplay}</Text>
            {options.map((commander) => {
              const selected = selectedCommander?.name === commander.name;
              return (
                <Pressable
                  key={commander.name}
                  style={[styles.commanderOption, selected && styles.commanderOptionSelected]}
                  onPress={() => setSelectedCommander(commander)}
                >
                  <DeckImage
                    uri={commander.imageUrl}
                    alt={commander.name}
                    style={styles.commanderImage}
                    containerStyle={styles.commanderImage}
                  />
                  <Text style={styles.commanderName}>{commander.name}</Text>
                  {selected ? <Ionicons name="checkmark" size={16} color={colors.primaryMuted} /> : null}
                </Pressable>
              );
            })}
            <Button
              label={saving ? labels.saving : labels.saveSelectedCommander}
              disabled={
                saving ||
                !selectedCommander ||
                (
                  selectedCommander.name === deck.commander &&
                  (selectedCommander.imageUrl || null) === (deck.commander_image || null)
                )
              }
              onPress={() => selectedCommander && handleSavePresentation(
                selectedCommander.name,
                selectedCommander.imageUrl || deck.commander_image,
              )}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.chooseCommanderArt}</Text>
          {loadingArts || saving ? (
            <View style={styles.searchingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.muted}>{labels.loadingArts}</Text>
            </View>
          ) : arts.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artRow}>
              {arts.map((art) => {
                const selected = activeImage === art.imageUrl;
                return (
                  <Pressable
                    key={`${art.id}-${art.imageUrl}`}
                    style={[styles.artCard, selected && styles.artCardSelected]}
                    disabled={saving}
                    onPress={() => handleSavePresentation(
                      selectedCommander?.name || deck.commander,
                      art.imageUrl,
                    )}
                  >
                    <DeckImage uri={art.imageUrl} alt={art.name} style={styles.artImage} containerStyle={styles.artImage} />
                    <Text style={styles.artSetName} numberOfLines={1}>{art.setName || labels.printing}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.muted}>{labels.noArtsFound}</Text>
          )}
        </View>

        <Button label={labels.close} variant="ghost" onPress={onClose} disabled={saving} />
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 8 },
  title: { color: colors.foreground, fontSize: 20, fontWeight: '700' },
  deckName: { color: colors.muted, fontSize: 14 },
  section: { gap: 10 },
  sectionTitle: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  commanderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  commanderOptionSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primarySurface,
  },
  commanderImage: { width: 56, height: 56, borderRadius: 8 },
  commanderName: { flex: 1, color: colors.foreground, fontSize: 14, fontWeight: '600' },
  searchingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  muted: { color: colors.muted, fontSize: 13 },
  artRow: { gap: 10, paddingVertical: 4 },
  artCard: {
    width: 132,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 8,
    gap: 4,
  },
  artCardSelected: { borderColor: colors.primaryLight, backgroundColor: colors.primarySurface },
  artImage: { width: '100%', height: 96, borderRadius: 6 },
  artSetName: { color: colors.foreground, fontSize: 11, fontWeight: '600' },
});
