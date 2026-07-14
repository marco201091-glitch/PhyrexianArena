import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommanderArt } from '@/components/deck/commander-art';
import { Button } from '@/components/ui/button';
import { CollapsiblePanel } from '@/components/ui/collapsible-panel';
import { colors } from '@/constants/theme';
import type { ArenaGuest } from '@/lib/arena-participants';

type TableGuestsSectionProps = {
  guests: ArenaGuest[];
  canManage: boolean;
  labels: {
    guestManagement: string;
    addGuest: string;
    noGuestsBody: string;
    guestBadge: string;
  };
  onAddGuest: () => void;
  onAddDeckToGuest: (guestId: string) => void;
  onDeleteGuest: (guestId: string) => void;
};

export function TableGuestsSection({
  guests,
  canManage,
  labels,
  onAddGuest,
  onAddDeckToGuest,
  onDeleteGuest,
}: TableGuestsSectionProps) {
  const guestMeta = guests.length > 0 ? `${guests.length}` : undefined;

  return (
    <CollapsiblePanel
      title={labels.guestManagement}
      meta={guestMeta}
      variant="strong"
    >
      {canManage ? (
        <Button label={labels.addGuest} onPress={onAddGuest} />
      ) : null}
      {guests.length === 0 ? (
        <Text style={styles.emptyBody}>{labels.noGuestsBody}</Text>
      ) : (
        guests.map((guest) => (
          <View key={guest.id} style={styles.guestRow}>
            <View style={styles.guestInfo}>
              <View style={styles.guestTitleRow}>
                <Text style={styles.guestName}>{guest.display_name}</Text>
                <Text style={styles.guestBadge}>{labels.guestBadge}</Text>
              </View>
              {(guest.arena_guest_decks || []).map((deck) => (
                <View key={deck.id} style={styles.guestDeckRow}>
                  <CommanderArt uri={deck.commander_image} alt={deck.commander} size="xs" />
                  <View style={styles.guestDeckInfo}>
                    <Text style={styles.guestDeckName} numberOfLines={1}>{deck.name}</Text>
                    <Text style={styles.guestDeckCommander} numberOfLines={1}>{deck.commander}</Text>
                  </View>
                </View>
              ))}
            </View>
            {canManage ? (
              <View style={styles.guestActions}>
                <Pressable onPress={() => onAddDeckToGuest(guest.id)}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primaryMuted} />
                </Pressable>
                <Pressable onPress={() => onDeleteGuest(guest.id)}>
                  <Ionicons name="trash-outline" size={16} color={colors.muted} />
                </Pressable>
              </View>
            ) : null}
          </View>
        ))
      )}
    </CollapsiblePanel>
  );
}

const styles = StyleSheet.create({
  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.tealMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.successBorder,
    padding: 12,
  },
  guestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guestInfo: {
    flex: 1,
    gap: 4,
  },
  guestTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guestName: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '600',
  },
  guestBadge: {
    color: colors.successBright,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  guestDeckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  guestDeckInfo: {
    flex: 1,
    gap: 1,
  },
  guestDeckName: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '600',
  },
  guestDeckCommander: {
    color: colors.muted,
    fontSize: 11,
  },
});