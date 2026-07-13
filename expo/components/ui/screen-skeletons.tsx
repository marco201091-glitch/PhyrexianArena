import { StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { colors, radii, spacing } from '@/constants/theme';

function DashboardSkeletonContent() {
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Skeleton height={28} width="55%" />
          <Skeleton height={14} width="80%" />
        </View>
        <View style={styles.headerActions}>
          <Skeleton height={40} width={100} borderRadius={radii.md} />
          <Skeleton height={40} width={100} borderRadius={radii.md} />
        </View>
      </View>
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

function StatsSkeletonContent() {
  return (
    <View style={styles.section}>
      <Skeleton height={24} width="50%" />
      <Skeleton height={14} width="70%" />
      <View style={styles.summaryRow}>
        <Skeleton height={72} borderRadius={radii.lg} style={styles.summaryCard} />
        <Skeleton height={72} borderRadius={radii.lg} style={styles.summaryCard} />
        <Skeleton height={72} borderRadius={radii.lg} style={styles.summaryCard} />
      </View>
      <SkeletonCard />
      <Skeleton height={120} borderRadius={radii.lg} />
    </View>
  );
}

function ProfileSkeletonContent() {
  return (
    <View style={styles.section}>
      <View style={styles.profileCard}>
        <Skeleton height={88} width={88} borderRadius={44} />
        <Skeleton height={22} width="45%" />
        <Skeleton height={14} width="35%" />
        <Skeleton height={14} width="55%" />
      </View>
      <View style={styles.deckActions}>
        <Skeleton height={44} borderRadius={radii.md} style={styles.flex} />
        <Skeleton height={44} borderRadius={radii.md} style={styles.flex} />
      </View>
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

function ArenaSkeletonContent() {
  return (
    <View style={styles.section}>
      <Skeleton height={16} width={60} />
      <Skeleton height={30} width="70%" />
      <Skeleton height={14} width="40%" />
      <View style={styles.actionRow}>
        <Skeleton height={44} borderRadius={radii.md} style={styles.flex} />
        <Skeleton height={44} borderRadius={radii.md} style={styles.flex} />
      </View>
      <Skeleton height={44} borderRadius={radii.lg} />
      <Skeleton height={100} borderRadius={radii.lg} />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

type ScreenSkeletonProps = {
  contentStyle?: object;
};

export function DashboardSkeleton({ contentStyle }: ScreenSkeletonProps) {
  return (
    <Screen scroll={false} padded={false}>
      <View style={[styles.section, contentStyle]}>
        <DashboardSkeletonContent />
      </View>
    </Screen>
  );
}

export function StatsSkeleton({ contentStyle }: ScreenSkeletonProps) {
  return (
    <Screen scroll={false} padded={false}>
      <View style={[styles.section, contentStyle]}>
        <StatsSkeletonContent />
      </View>
    </Screen>
  );
}

export function ProfileSkeleton({ contentStyle }: ScreenSkeletonProps) {
  return (
    <Screen scroll={false} padded={false}>
      <View style={[styles.section, contentStyle]}>
        <ProfileSkeletonContent />
      </View>
    </Screen>
  );
}

export function ArenaSkeleton({ contentStyle }: ScreenSkeletonProps) {
  return (
    <Screen scroll={false} padded={false}>
      <View style={[styles.section, contentStyle]}>
        <ArenaSkeletonContent />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  headerRow: {
    gap: spacing.md,
  },
  headerText: {
    gap: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
  },
  profileCard: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 20,
  },
  deckActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
});