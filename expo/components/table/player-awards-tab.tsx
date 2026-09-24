import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Line, Polygon, Rect, Stop } from 'react-native-svg';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing } from '@/constants/theme';
import type { PlayerAward, PlayerAwardKind } from '@/lib/player-awards';

const meta: Record<PlayerAwardKind, { it: string; en: string; hintIt: string; hintEn: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  veteran: { it: 'Veterano', en: 'Veteran', hintIt: 'Più partite giocate', hintEn: 'Most games played', icon: 'medal-outline', color: '#7dd3fc' }, eternal_second: { it: 'Eterno secondo', en: 'Eternal runner-up', hintIt: 'Più secondi posti', hintEn: 'Most second places', icon: 'ribbon-outline', color: '#e2e8f0' }, arena_king: { it: 'Re dell’arena', en: 'Arena king', hintIt: 'Miglior win rate · minimo 5 partite', hintEn: 'Best win rate · 5-game minimum', icon: 'trophy-outline', color: '#fcd34d' }, hitman: { it: 'Sicario', en: 'Hitman', hintIt: 'Più eliminazioni', hintEn: 'Most eliminations', icon: 'locate-outline', color: '#fda4af' }, berserker: { it: 'Berserker', en: 'Berserker', hintIt: 'Più danni inflitti', hintEn: 'Most damage dealt', icon: 'flame-outline', color: '#fdba74' }, archenemy: { it: 'Archenemy', en: 'Archenemy', hintIt: 'Più volte eliminato per primo', hintEn: 'Most first eliminations', icon: 'skull-outline', color: '#fca5a5' }, combo: { it: 'How about a magic trick?', en: 'How about a magic trick?', hintIt: 'Più vittorie per combo', hintEn: 'Most combo wins', icon: 'sparkles-outline', color: '#c4b5fd' }, last_standing: { it: 'This will be a slaughter', en: 'This will be a slaughter', hintIt: 'Più vittorie Last Standing', hintEn: 'Most Last Standing wins', icon: 'flash-outline', color: '#f0abfc' }, concession: { it: 'FF at 20', en: 'FF at 20', hintIt: 'Più vittorie per concessione', hintEn: 'Most concession wins', icon: 'flag-outline', color: '#bef264' }, true_skills: { it: 'True display of skills', en: 'True display of skills', hintIt: 'Più vittorie alternate o other', hintEn: 'Most alternate or other wins', icon: 'shield-checkmark-outline', color: '#5eead4' },
};
const medal = [
  { id: 'gold', stops: ['#342b18', '#5b4c27', '#827044', '#594925', '#302715'], badge: ['#89651b', '#dfbd55', '#fff3bd', '#b78b2a', '#694b10'], text: '#241600' },
  { id: 'silver', stops: ['#28313b', '#4e5b69', '#73808d', '#4b5866', '#252e38'], badge: ['#657585', '#cbd5df', '#ffffff', '#a5b2bf', '#526171'], text: '#17202a' },
  { id: 'bronze', stops: ['#38271c', '#62432c', '#865d3e', '#61422d', '#34251b'], badge: ['#844a28', '#d2945e', '#ffe0b4', '#b66c39', '#67391d'], text: '#2a1005' },
];
function MetalMedal({ rank }: { rank: number }) {
  const tone = medal[rank - 1] ?? medal[2];
  const rosette = '22,3 25,7 30,5 32,10 37,11 36,16 39,19 36,22 37,27 32,28 30,33 25,31 22,36 19,31 14,33 12,28 7,27 8,22 5,19 8,16 7,11 12,10 14,5 19,7';
  const coin = '22,3 26,5 31,4 34,8 38,11 37,16 39,19 37,23 38,28 34,31 31,34 26,33 22,36 18,33 13,34 10,31 6,28 7,23 5,19 7,15 6,10 10,7 13,4 18,5';
  const shield = '11,4 33,4 34,18 31,26 22,35 13,26 10,18';
  const center = 22;
  const centerY = 19;
  const medalPoints = rank === 1 ? rosette : rank === 2 ? coin : shield;
  const ribbonFill = rank === 1 ? '#75571d' : rank === 2 ? '#66717f' : '#79503a';
  const pleats = rank === 1 ? 12 : rank === 2 ? 8 : 4;
  const ribbonLines = rank === 1
    ? [[10, 28, 11, 41], [13, 29, 14, 43], [31, 28, 33, 41], [28, 29, 30, 43]]
    : rank === 2
      ? [[11, 29, 12, 40], [32, 29, 31, 40]]
      : [[13, 29, 13, 38], [31, 29, 31, 38]];
  return <View style={styles.medal}><Svg width={44} height={48} viewBox="0 0 44 48"><Defs><LinearGradient id={`medal-${tone.id}`} x1="2" y1="2" x2="32" y2="32">{tone.badge.map((color, index) => <Stop key={color} offset={`${[0, 28, 50, 76, 100][index]}%`} stopColor={color} />)}</LinearGradient><LinearGradient id={`ribbon-${tone.id}`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor={ribbonFill} /><Stop offset="48%" stopColor="#20232c" /><Stop offset="100%" stopColor={ribbonFill} /></LinearGradient></Defs>
    <Polygon points={rank === 1 ? '9,20 19,24 17,46 12,42 8,45 6,27' : '10,20 18,23 16,44 12,40 8,43 7,27'} fill={`url(#ribbon-${tone.id})`} stroke="rgba(255,255,255,0.35)" strokeWidth={0.8} />
    <Polygon points={rank === 1 ? '35,20 25,24 27,46 32,42 36,45 38,27' : '34,20 26,23 28,44 32,40 36,43 37,27'} fill={`url(#ribbon-${tone.id})`} stroke="rgba(255,255,255,0.35)" strokeWidth={0.8} />
    {ribbonLines.map(([x1, y1, x2, y2], index) => <Line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.36)" strokeWidth={0.8} />)}
    <Polygon points={medalPoints} fill={`url(#medal-${tone.id})`} stroke="rgba(255,255,255,0.86)" strokeWidth={1.15} />
    {Array.from({ length: pleats }, (_, index) => { const angle = (Math.PI * 2 * index) / pleats - Math.PI / 2; const x1 = center + Math.cos(angle) * (rank === 1 ? 9.5 : rank === 2 ? 9 : 7); const y1 = centerY + Math.sin(angle) * (rank === 1 ? 9.5 : rank === 2 ? 9 : 7); const x2 = center + Math.cos(angle) * (rank === 1 ? 13.5 : rank === 2 ? 12 : 10); const y2 = centerY + Math.sin(angle) * (rank === 1 ? 13.5 : rank === 2 ? 12 : 10); return <Line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke={index % 2 ? 'rgba(44,31,12,0.42)' : 'rgba(255,255,255,0.5)'} strokeWidth={0.8} />; })}
    <Circle cx={center} cy={centerY} r={rank === 1 ? 8.5 : rank === 2 ? 8 : 6.5} fill={`url(#medal-${tone.id})`} stroke="rgba(255,255,255,0.82)" strokeWidth={1} />
    <Circle cx={center} cy={centerY} r={rank === 1 ? 6.2 : rank === 2 ? 5.8 : 4.5} fill="none" stroke="rgba(37,30,21,0.42)" strokeWidth={0.8} />
  </Svg><Text style={[styles.plateRank, { color: tone.text }]}>{rank}</Text></View>;
}
function MetalPlate({ rank }: { rank: number }) {
  const tone = medal[rank - 1] ?? medal[2];
  return <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}><Defs><LinearGradient id={`plate-${tone.id}`} x1="0" y1="0" x2="1" y2="0">{tone.stops.map((color, index) => <Stop key={color} offset={`${[0, 16, 46, 76, 100][index]}%`} stopColor={color} />)}</LinearGradient></Defs><Rect x="0" y="0" width="100%" height="100%" rx="12" fill={`url(#plate-${tone.id})`} opacity={0.78} /></Svg>;
}
export function PlayerAwardsTab({ awards, language }: { awards: PlayerAward[]; language: 'it' | 'en' }) {
  const groups = Array.from(awards.filter((award) => award.kind !== 'berserker').reduce((map, award) => { const rows = map.get(award.kind) ?? []; rows.push(award); map.set(award.kind, rows); return map; }, new Map<PlayerAwardKind, PlayerAward[]>()).values());
  if (!groups.length) return <PhyrexianPanel style={styles.empty}><Text style={styles.emptyText}>{language === 'it' ? 'Nessun award giocatore disponibile' : 'No player awards yet'}</Text></PhyrexianPanel>;
  return <View style={styles.list}>{groups.map((group) => { const item = meta[group[0].kind]; return <PhyrexianPanel key={group[0].kind} style={[styles.panel, { borderColor: `${item.color}55` }]}><View style={styles.header}><View style={[styles.iconBox, { borderColor: `${item.color}88`, backgroundColor: `${item.color}1f` }]}><Ionicons name={item.icon} size={18} color={item.color} /></View><View style={styles.grow}><Text style={styles.eyebrow}>{language === 'it' ? 'TOP 3 GIOCATORI' : 'TOP 3 PLAYERS'}</Text><Text style={[styles.title, { color: item.color }]}>{language === 'it' ? item.it : item.en}</Text></View><Text style={styles.count}>{group.length}/3</Text></View><Text style={styles.hint}>{language === 'it' ? item.hintIt : item.hintEn}</Text><View style={styles.podium}>{group.map((award) => <View key={`${award.kind}:${award.rank}:${award.name}`} style={styles.plate}><MetalPlate rank={award.rank} /><MetalMedal rank={award.rank} /><Text style={styles.name} numberOfLines={1}>{award.name}</Text><Text style={styles.value}>{award.value}{award.kind === 'arena_king' ? '%' : ''}</Text></View>)}</View></PhyrexianPanel>; })}</View>;
}
const styles = StyleSheet.create({ list: { gap: spacing.md }, panel: { gap: spacing.sm, padding: spacing.md }, header: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, paddingBottom: spacing.sm }, iconBox: { width: 36, height: 36, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, grow: { flex: 1 }, eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 }, title: { fontSize: 15, fontWeight: '900' }, count: { color: colors.muted, fontSize: 11, fontWeight: '800' }, hint: { color: colors.muted, fontSize: 12 }, podium: { gap: spacing.sm }, plate: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: '#354052', borderRadius: 12, overflow: 'hidden', paddingHorizontal: 10, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 5, elevation: 2 }, medal: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.34, shadowRadius: 4, elevation: 3 }, plateRank: { position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center', fontSize: 12, fontWeight: '900' }, name: { color: colors.foreground, flex: 1, fontSize: 14, fontWeight: '800' }, value: { color: colors.foreground, fontSize: 18, fontWeight: '900' }, empty: { alignItems: 'center' }, emptyText: { color: colors.muted } });
