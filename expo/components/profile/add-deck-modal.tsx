import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommanderPicker } from '@/components/commander/commander-picker';
import { DeckImage } from '@/components/deck/deck-image';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { colors } from '@/constants/theme';
import { useCommanderArts } from '@/hooks/use-commander-arts';
import { prefetchCommanderNames, prefetchDeckImageUrls } from '@/lib/deck-image-cache';
import { apiPost } from '@/lib/api';
import { fetchCommanderArtOptions } from '@/lib/commander-arts';
import type { CommanderSearchResult } from '@/lib/commander-types';
import {
  buildArchidektBatchCommanderSelections,
  getDefaultImportedCommanderOption,
  isImportedCommanderOptionSelected,
  repairImportedCommanderOptions,
  type CommanderOption,
  type ImportedDeckPreview,
} from '@/lib/deck-importers';
import { filterSelectableCommanderOptions } from '@/lib/deck-metadata';

type AddDeckMode = 'import' | 'manual' | 'archidekt';

async function fetchCommanderArtUrl(name: string): Promise<string | null> {
  const arts = await fetchCommanderArtOptions(name);
  return arts[0]?.imageUrl?.trim() || null;
}

async function normalizeImportedDeckPreview(deck: ImportedDeckPreview): Promise<ImportedDeckPreview> {
  const options = deck.commanderOptions || [];
  let repairedOptions = options;

  if (options.length > 1) {
    repairedOptions = await repairImportedCommanderOptions(options, fetchCommanderArtUrl);
  } else if (options.length === 1 && !options[0]?.imageUrl?.trim()) {
    const imageUrl = await fetchCommanderArtUrl(options[0].name);
    if (imageUrl) {
      repairedOptions = [{ ...options[0], imageUrl }];
    }
  } else if (options.length === 0 && !deck.commanderImageUrl?.trim()) {
    const imageUrl = await fetchCommanderArtUrl(deck.commander);
    if (imageUrl) {
      return {
        ...deck,
        commanderImageUrl: imageUrl,
        commanderOptions: [{
          name: deck.commander,
          imageUrl,
          colorIdentity: deck.colorIdentity || [],
        }],
      };
    }
    return deck;
  }

  const defaultCommander = getDefaultImportedCommanderOption({
    ...deck,
    commanderOptions: repairedOptions,
  });

  return {
    ...deck,
    commanderOptions: repairedOptions,
    commanderImageUrl: defaultCommander.imageUrl || deck.commanderImageUrl,
  };
}

type AddDeckModalProps = {
  visible: boolean;
  saving: boolean;
  existingSourceUrls: string[];
  labels: {
    title: string;
    importTab: string;
    manualTab: string;
    archidektTab: string;
    importHint: string;
    deckUrl: string;
    deckUrlPlaceholder: string;
    import: string;
    importing: string;
    importFailed: string;
    preview: string;
    deckName: string;
    deckNamePlaceholder: string;
    searchCommander: string;
    searchPlaceholder: string;
    searching: string;
    noResults: string;
    selectedCommander: string;
    partnerHint: string;
    chooseCommanderArt: string;
    loadingArts: string;
    noArtsFound: string;
    printing: string;
    chooseCommanderToDisplay: string;
    commanderRequired: string;
    archidektUsername: string;
    archidektUsernamePlaceholder: string;
    archidektPublicHint: string;
    loadDecks: string;
    loadingDecks: string;
    decksSelected: string;
    archidektBatchCommanderHint: string;
    all: string;
    none: string;
    alreadySaved: string;
    saveDecks: string;
    noNewDecks: string;
    overwriteDeckTitle: string;
    overwriteDeckMessage: string;
    overwriteDecksTitle: string;
    overwriteDecksMessage: string;
    overwrite: string;
    skipDuplicates: string;
    cancel: string;
    save: string;
    saving: string;
    back: string;
  };
  onClose: () => void;
  onError: (message: string) => void;
  onSaveImported: (deck: ImportedDeckPreview, options: {
    selectedCommander?: CommanderOption | null;
    deckName?: string;
    overwrite?: boolean;
  }) => Promise<{ inserted: number; updated: number; skipped: number }>;
  onSaveManual: (input: {
    commander: CommanderSearchResult;
    partnerCommander?: CommanderSearchResult | null;
    deckName: string;
    selectedArtUrl?: string | null;
  }) => Promise<void>;
  onSaveArchidektBatch: (input: {
    decks: ImportedDeckPreview[];
    selectedUrls: string[];
    selectedCommanders: Record<string, CommanderOption>;
    overwriteExisting?: boolean;
  }) => Promise<{ inserted: number; updated: number; skipped: number }>;
};

type OverwriteConfirmState =
  | { kind: 'single' }
  | { kind: 'bulk'; count: number };

export function AddDeckModal({
  visible,
  saving,
  existingSourceUrls,
  labels,
  onClose,
  onError,
  onSaveImported,
  onSaveManual,
  onSaveArchidektBatch,
}: AddDeckModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const modalBodyHeight = Math.min(windowHeight * 0.62, 520);
  const [overwriteConfirm, setOverwriteConfirm] = useState<OverwriteConfirmState | null>(null);
  const overwriteResolver = useRef<((value: boolean | 'overwrite' | 'skip' | 'cancel') => void) | null>(null);
  const [mode, setMode] = useState<AddDeckMode>('import');
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importedDeck, setImportedDeck] = useState<ImportedDeckPreview | null>(null);
  const [selectedImportedCommander, setSelectedImportedCommander] = useState<CommanderOption | null>(null);
  const [deckName, setDeckName] = useState('');
  const [selectedCommander, setSelectedCommander] = useState<CommanderSearchResult | null>(null);
  const [selectedPartnerCommander, setSelectedPartnerCommander] = useState<CommanderSearchResult | null>(null);
  const [selectedArtUrl, setSelectedArtUrl] = useState<string | null>(null);
  const [archidektUsername, setArchidektUsername] = useState('');
  const [importingUserDecks, setImportingUserDecks] = useState(false);
  const [importedUserDecks, setImportedUserDecks] = useState<ImportedDeckPreview[]>([]);
  const [selectedUserDeckCommanders, setSelectedUserDeckCommanders] = useState<Record<string, CommanderOption>>({});
  const [selectedUserDeckUrls, setSelectedUserDeckUrls] = useState<string[]>([]);

  const { arts: importedArts, loading: loadingImportedArts } = useCommanderArts(
    mode === 'import' && selectedImportedCommander ? selectedImportedCommander.name : null,
  );

  useEffect(() => {
    if (!visible) return;
    setMode('import');
    setImportUrl('');
    setImportedDeck(null);
    setSelectedImportedCommander(null);
    setDeckName('');
    setSelectedCommander(null);
    setSelectedPartnerCommander(null);
    setSelectedArtUrl(null);
    setArchidektUsername('');
    setImportedUserDecks([]);
    setSelectedUserDeckCommanders({});
    setSelectedUserDeckUrls([]);
  }, [visible]);

  const commanderLabels = {
    deckName: labels.deckName,
    deckNamePlaceholder: labels.deckNamePlaceholder,
    searchCommander: labels.searchCommander,
    searchPlaceholder: labels.searchPlaceholder,
    searching: labels.searching,
    noResults: labels.noResults,
    selectedCommander: labels.selectedCommander,
    partnerHint: labels.partnerHint,
    chooseCommanderArt: labels.chooseCommanderArt,
    loadingArts: labels.loadingArts,
    noArtsFound: labels.noArtsFound,
    printing: labels.printing,
  };

  const handleImport = async () => {
    if (!importUrl.trim()) return;

    setImporting(true);
    try {
      const { data, error, status } = await apiPost<ImportedDeckPreview & { error?: string }>(
        '/api/deck-import',
        { url: importUrl.trim() },
      );

      if (status !== 200 || error || !data?.name) {
        throw new Error(error || labels.importFailed);
      }

      const preview = await normalizeImportedDeckPreview({
        name: data.name,
        commander: data.commander,
        commanderImageUrl: data.commanderImageUrl,
        commanderOptions: data.commanderOptions || [],
        colorIdentity: data.colorIdentity || [],
        bracket: data.bracket,
        sourceUrl: data.sourceUrl,
        sourceType: data.sourceType,
      });

      const defaultCommander = getDefaultImportedCommanderOption(preview);

      setImportedDeck(preview);
      setSelectedImportedCommander(defaultCommander);
      setDeckName(preview.name);
      void prefetchDeckImageUrls([
        preview.commanderImageUrl,
        ...(preview.commanderOptions || []).map((option) => option.imageUrl),
      ], { background: true });
      void prefetchCommanderNames([
        preview.commander,
        ...(preview.commanderOptions || []).map((option) => option.name),
      ], { background: true });
    } catch (importError) {
      onError(importError instanceof Error ? importError.message : labels.importFailed);
    } finally {
      setImporting(false);
    }
  };

  const handleArchidektImport = async () => {
    if (!archidektUsername.trim()) return;

    setImportingUserDecks(true);
    try {
      const { data, error, status } = await apiPost<{ decks?: ImportedDeckPreview[]; error?: string }>(
        '/api/archidekt-user-decks',
        { username: archidektUsername.trim() },
      );

      if (status !== 200 || error) {
        throw new Error(error || labels.importFailed);
      }

      const validDecks = await Promise.all(
        (Array.isArray(data?.decks) ? data.decks : [])
          .filter((deck) => Boolean(deck.sourceUrl && deck.sourceType))
          .map((deck) => normalizeImportedDeckPreview(deck as ImportedDeckPreview)),
      );

      const initialSelections = buildArchidektBatchCommanderSelections(validDecks);

      setImportedUserDecks(validDecks);
      setSelectedUserDeckCommanders(initialSelections);
      setSelectedUserDeckUrls(validDecks.map((deck) => deck.sourceUrl));
      void prefetchDeckImageUrls(
        validDecks.flatMap((deck) => [
          deck.commanderImageUrl,
          ...(deck.commanderOptions || []).map((option) => option.imageUrl),
        ]),
        { background: true },
      );
      void prefetchCommanderNames(
        validDecks.flatMap((deck) => [
          deck.commander,
          ...(deck.commanderOptions || []).map((option) => option.name),
        ]),
        { background: true },
      );
    } catch (importError) {
      onError(importError instanceof Error ? importError.message : labels.importFailed);
    } finally {
      setImportingUserDecks(false);
    }
  };

  const closeOverwriteConfirm = (value: boolean | 'overwrite' | 'skip' | 'cancel') => {
    overwriteResolver.current?.(value);
    overwriteResolver.current = null;
    setOverwriteConfirm(null);
  };

  const confirmOverwriteSingle = () => new Promise<boolean>((resolve) => {
    overwriteResolver.current = (value) => resolve(value === true);
    setOverwriteConfirm({ kind: 'single' });
  });

  const confirmOverwriteBulk = (count: number) => new Promise<'overwrite' | 'skip' | 'cancel'>((resolve) => {
    overwriteResolver.current = (value) => {
      if (value === 'overwrite' || value === 'skip' || value === 'cancel') {
        resolve(value);
        return;
      }
      resolve('cancel');
    };
    setOverwriteConfirm({ kind: 'bulk', count });
  });

  const handleSave = async () => {
    if (mode === 'import') {
      if (!importedDeck) {
        onError(labels.importFailed);
        return;
      }

      const isDuplicate = existingSourceUrls.includes(importedDeck.sourceUrl);
      if (isDuplicate) {
        const overwrite = await confirmOverwriteSingle();
        if (!overwrite) return;
      }

      await onSaveImported(importedDeck, {
        selectedCommander: selectedImportedCommander,
        deckName: deckName.trim() || importedDeck.name,
        overwrite: isDuplicate,
      });
      return;
    }

    if (mode === 'archidekt') {
      const duplicateCount = selectedUserDeckUrls.filter((url) => existingSourceUrls.includes(url)).length;
      let overwriteExisting = false;

      if (duplicateCount > 0) {
        const choice = await confirmOverwriteBulk(duplicateCount);
        if (choice === 'cancel') return;
        overwriteExisting = choice === 'overwrite';
      }

      const result = await onSaveArchidektBatch({
        decks: importedUserDecks,
        selectedUrls: selectedUserDeckUrls,
        selectedCommanders: selectedUserDeckCommanders,
        overwriteExisting,
      });
      if (result.inserted === 0 && result.updated === 0) {
        onError(labels.noNewDecks);
      }
      return;
    }

    if (!selectedCommander) {
      onError(labels.commanderRequired);
      return;
    }

    await onSaveManual({
      commander: selectedCommander,
      partnerCommander: selectedPartnerCommander,
      deckName: deckName.trim(),
      selectedArtUrl,
    });
  };

  const renderImportedArtPicker = () => {
    if (!selectedImportedCommander) return null;

    return (
      <View style={styles.artSection}>
        <Text style={styles.sectionTitle}>{labels.chooseCommanderArt}</Text>
        {loadingImportedArts ? (
          <View style={styles.searchingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.muted}>{labels.loadingArts}</Text>
          </View>
        ) : importedArts.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artRow}>
            {importedArts.map((art) => {
              const selected = selectedImportedCommander.imageUrl === art.imageUrl;
              return (
                <Pressable
                  key={`${art.id}-${art.imageUrl}`}
                  style={[styles.artCard, selected && styles.artCardSelected]}
                  onPress={() => setSelectedImportedCommander((current) =>
                    current ? { ...current, imageUrl: art.imageUrl } : current
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
    );
  };

  const actionFooter = (
    <View style={styles.actions}>
      <Button label={labels.cancel} variant="ghost" onPress={onClose} style={styles.actionButton} />
      <Button
        label={
          saving
            ? labels.saving
            : mode === 'archidekt' && importedUserDecks.length > 0
              ? labels.saveDecks
              : labels.save
        }
        disabled={
          saving ||
          (mode === 'import' ? !importedDeck : false) ||
          (mode === 'manual' ? !selectedCommander : false) ||
          (mode === 'archidekt' ? importedUserDecks.length === 0 || selectedUserDeckUrls.length === 0 : false)
        }
        onPress={handleSave}
        style={styles.actionButton}
      />
    </View>
  );

  return (
    <>
    <Modal visible={visible} onClose={onClose} scroll={false} footer={actionFooter}>
      <View style={[styles.shell, { height: modalBodyHeight }]}>
        <Text style={styles.title}>{labels.title}</Text>

        <View style={styles.tabRow}>
          {(['import', 'manual', 'archidekt'] as AddDeckMode[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, mode === tab && styles.tabActive]}
              onPress={() => setMode(tab)}
            >
              <Text style={[styles.tabLabel, mode === tab && styles.tabLabelActive]}>
                {tab === 'import' ? labels.importTab : tab === 'manual' ? labels.manualTab : labels.archidektTab}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
        {mode === 'import' ? (
          <>
            {!importedDeck ? (
              <>
                <Text style={styles.hint}>{labels.importHint}</Text>
                <Input
                  label={labels.deckUrl}
                  value={importUrl}
                  onChangeText={setImportUrl}
                  placeholder={labels.deckUrlPlaceholder}
                  autoCapitalize="none"
                />
                <Button
                  label={importing ? labels.importing : labels.import}
                  disabled={importing || !importUrl.trim()}
                  onPress={handleImport}
                />
              </>
            ) : (
              <View style={styles.preview}>
                <Text style={styles.previewLabel}>{labels.preview}</Text>
                <DeckImage
                  uri={selectedImportedCommander?.imageUrl || importedDeck.commanderImageUrl}
                  alt={selectedImportedCommander?.name || importedDeck.commander}
                  style={styles.previewImage}
                  containerStyle={styles.previewImage}
                />
                <Text style={styles.previewName}>
                  {(importedDeck.commanderOptions?.length || 0) > 1
                    ? importedDeck.commander
                    : (selectedImportedCommander?.name || importedDeck.commander)}
                </Text>
                <Text style={styles.previewMeta}>{importedDeck.sourceType} · {importedDeck.name}</Text>
                {(filterSelectableCommanderOptions(importedDeck.commanderOptions || []).length) > 1 ? (
                  <Text style={styles.previewCommanderPick}>
                    {labels.chooseCommanderToDisplay}: {selectedImportedCommander?.name}
                  </Text>
                ) : null}
                <Input
                  label={labels.deckName}
                  value={deckName}
                  onChangeText={setDeckName}
                  placeholder={labels.deckNamePlaceholder}
                />
                {(filterSelectableCommanderOptions(importedDeck.commanderOptions || []).length) > 1 ? (
                  <View style={styles.commandersGrid}>
                    <Text style={styles.sectionTitle}>{labels.chooseCommanderToDisplay}</Text>
                    {filterSelectableCommanderOptions(importedDeck.commanderOptions || []).map((commander) => {
                      const selected = isImportedCommanderOptionSelected(selectedImportedCommander, commander);
                      return (
                        <Pressable
                          key={commander.name}
                          style={[styles.commanderOption, selected && styles.commanderOptionSelected]}
                          onPress={() => setSelectedImportedCommander(commander)}
                        >
                          <DeckImage
                            uri={commander.imageUrl}
                            alt={commander.name}
                            style={styles.commanderOptionImage}
                            containerStyle={styles.commanderOptionImage}
                          />
                          <Text style={styles.commanderOptionName} numberOfLines={2}>{commander.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
                {renderImportedArtPicker()}
              </View>
            )}
          </>
        ) : null}

        {mode === 'manual' ? (
          <CommanderPicker
            deckName={deckName}
            onDeckNameChange={setDeckName}
            selectedCommander={selectedCommander}
            onSelectCommander={setSelectedCommander}
            selectedPartnerCommander={selectedPartnerCommander}
            onSelectPartnerCommander={setSelectedPartnerCommander}
            selectedArtUrl={selectedArtUrl}
            onSelectArtUrl={setSelectedArtUrl}
            disabled={saving}
            labels={commanderLabels}
          />
        ) : null}

        {mode === 'archidekt' ? (
          importedUserDecks.length === 0 ? (
            <>
              <Input
                label={labels.archidektUsername}
                value={archidektUsername}
                onChangeText={setArchidektUsername}
                placeholder={labels.archidektUsernamePlaceholder}
                autoCapitalize="none"
              />
              <Text style={styles.hint}>{labels.archidektPublicHint}</Text>
              <Button
                label={importingUserDecks ? labels.loadingDecks : labels.loadDecks}
                disabled={importingUserDecks || !archidektUsername.trim()}
                onPress={handleArchidektImport}
              />
            </>
          ) : (
            <>
              <View style={styles.batchHeader}>
                <Text style={styles.sectionTitle}>
                  {selectedUserDeckUrls.length}/{importedUserDecks.length} {labels.decksSelected}
                </Text>
                <Text style={styles.hint}>{labels.archidektBatchCommanderHint}</Text>
                <View style={styles.batchSelectActions}>
                  <Button
                    label={labels.all}
                    variant="outline"
                    onPress={() => setSelectedUserDeckUrls(importedUserDecks.map((deck) => deck.sourceUrl))}
                    style={styles.batchSelectButton}
                  />
                  <Button
                    label={labels.none}
                    variant="outline"
                    onPress={() => setSelectedUserDeckUrls([])}
                    style={styles.batchSelectButton}
                  />
                </View>
              </View>
              <View style={styles.batchList}>
                {importedUserDecks.map((deck) => {
                  const selectedCommander = selectedUserDeckCommanders[deck.sourceUrl] || getDefaultImportedCommanderOption(deck);
                  const alreadySaved = existingSourceUrls.includes(deck.sourceUrl);
                  const selectedForImport = selectedUserDeckUrls.includes(deck.sourceUrl);

                  return (
                    <View
                      key={deck.sourceUrl}
                      style={[styles.batchCard, !selectedForImport && styles.batchCardMuted]}
                    >
                      <View style={styles.batchCardHeader}>
                        <Pressable
                          style={[styles.checkbox, selectedForImport && styles.checkboxSelected]}
                          onPress={() => setSelectedUserDeckUrls((current) =>
                            selectedForImport
                              ? current.filter((url) => url !== deck.sourceUrl)
                              : [...current, deck.sourceUrl]
                          )}
                        >
                          {selectedForImport ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                        </Pressable>
                        <DeckImage
                          uri={selectedCommander.imageUrl}
                          alt={selectedCommander.name}
                          style={styles.batchImage}
                          containerStyle={styles.batchImage}
                        />
                        <View style={styles.batchInfo}>
                          <Text style={styles.previewName} numberOfLines={1}>{deck.name}</Text>
                          <Text style={styles.previewMeta} numberOfLines={1}>{selectedCommander.name}</Text>
                          {alreadySaved ? <Text style={styles.alreadySaved}>{labels.alreadySaved}</Text> : null}
                        </View>
                      </View>
                      {(filterSelectableCommanderOptions(deck.commanderOptions || []).length) > 1 ? (
                        <View style={styles.commandersGrid}>
                          {filterSelectableCommanderOptions(deck.commanderOptions || []).map((commander) => {
                            const selected = isImportedCommanderOptionSelected(selectedCommander, commander);
                            return (
                              <Pressable
                                key={`${deck.sourceUrl}-${commander.name}`}
                                style={[styles.commanderOption, selected && styles.commanderOptionSelected]}
                                onPress={() => setSelectedUserDeckCommanders((current) => ({
                                  ...current,
                                  [deck.sourceUrl]: commander,
                                }))}
                              >
                                <DeckImage
                                  uri={commander.imageUrl}
                                  alt={commander.name}
                                  style={styles.commanderOptionImage}
                                  containerStyle={styles.commanderOptionImage}
                                />
                                <Text style={styles.commanderOptionName} numberOfLines={2}>{commander.name}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
              <Button
                label={labels.back}
                variant="ghost"
                onPress={() => {
                  setImportedUserDecks([]);
                  setSelectedUserDeckCommanders({});
                  setSelectedUserDeckUrls([]);
                }}
              />
            </>
          )
        ) : null}
        </ScrollView>
      </View>
    </Modal>

    <ConfirmModal
      visible={overwriteConfirm !== null}
      title={
        overwriteConfirm?.kind === 'bulk'
          ? labels.overwriteDecksTitle
          : labels.overwriteDeckTitle
      }
      message={
        overwriteConfirm?.kind === 'bulk'
          ? labels.overwriteDecksMessage.replace('{count}', String(overwriteConfirm.count))
          : labels.overwriteDeckMessage
      }
      onClose={() => closeOverwriteConfirm(overwriteConfirm?.kind === 'bulk' ? 'cancel' : false)}
      actions={
        overwriteConfirm?.kind === 'bulk'
          ? [
              {
                label: labels.cancel,
                variant: 'ghost',
                onPress: () => closeOverwriteConfirm('cancel'),
              },
              {
                label: labels.skipDuplicates,
                variant: 'ghost',
                onPress: () => closeOverwriteConfirm('skip'),
              },
              {
                label: labels.overwrite,
                variant: 'destructive',
                onPress: () => closeOverwriteConfirm('overwrite'),
              },
            ]
          : [
              {
                label: labels.cancel,
                variant: 'ghost',
                onPress: () => closeOverwriteConfirm(false),
              },
              {
                label: labels.overwrite,
                variant: 'destructive',
                onPress: () => closeOverwriteConfirm(true),
              },
            ]
      }
    />
    </>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  bodyContent: {
    gap: 14,
    paddingBottom: 8,
  },
  title: { color: colors.foreground, fontSize: 20, fontWeight: '700' },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 4,
  },
  tab: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabActive: { backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.primaryLight },
  tabLabel: { color: colors.muted, fontWeight: '600', fontSize: 12 },
  tabLabelActive: { color: colors.foreground },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  preview: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 12,
    gap: 10,
  },
  previewLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  previewImage: { width: '100%', height: 120, borderRadius: 8 },
  previewName: { color: colors.foreground, fontWeight: '700', fontSize: 15 },
  previewMeta: { color: colors.primaryMuted, fontSize: 12 },
  previewCommanderPick: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  sectionTitle: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  commandersGrid: { gap: 8 },
  commanderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
  },
  commanderOptionSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primarySurface,
  },
  commanderOptionImage: { width: 56, height: 40, borderRadius: 6 },
  commanderOptionName: { flex: 1, color: colors.foreground, fontSize: 13, fontWeight: '600' },
  artSection: { gap: 8 },
  searchingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  muted: { color: colors.muted, fontSize: 13 },
  artRow: { gap: 10, paddingVertical: 4 },
  artCard: {
    width: 132,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.inputBg,
    padding: 8,
    gap: 4,
  },
  artCardSelected: { borderColor: colors.primaryLight, backgroundColor: colors.primarySurface },
  artImage: { width: '100%', height: 96, borderRadius: 6 },
  artSetName: { color: colors.foreground, fontSize: 11, fontWeight: '600' },
  batchHeader: { gap: 8 },
  batchSelectActions: { flexDirection: 'row', gap: 10 },
  batchSelectButton: { flex: 1 },
  batchList: { gap: 10 },
  batchCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceMuted,
    padding: 10,
    gap: 8,
  },
  batchCardMuted: { opacity: 0.7 },
  batchCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { borderColor: colors.primaryLight, backgroundColor: colors.primary },
  batchImage: { width: 72, height: 52, borderRadius: 6 },
  batchInfo: { flex: 1, gap: 2 },
  alreadySaved: { color: '#fbbf24', fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1 },
});