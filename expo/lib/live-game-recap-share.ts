import { buildLiveGameRecap } from '@/lib/live-game-recap';
import type { LiveGameRecord } from '@/lib/live-game';

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (character) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
}[character] ?? character));

function formatDuration(seconds: number | null) {
  if (seconds == null) return '—';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function buildLiveGameRecapShareSvg(record: LiveGameRecord, locale: 'it' | 'en' = 'en') {
  const recap = buildLiveGameRecap(record);
  const title = locale === 'it' ? 'Riepilogo partita' : 'Game recap';
  const first = locale === 'it' ? 'Primo' : 'First';
  const corrections = locale === 'it' ? 'correzioni' : 'corrections';
  const direction = recap.startingDirection === 'clockwise'
    ? (locale === 'it' ? 'orario' : 'clockwise')
    : recap.startingDirection === 'counterclockwise'
      ? (locale === 'it' ? 'antiorario' : 'counterclockwise')
      : '—';
  const rows = recap.players.slice(0, 6).map((player, index) => {
    const y = 238 + index * 94;
    const metrics = `⚔ ${player.damageDealt}   ♥ +${player.lifeGained}   ☠ ${player.eliminationsCaused}${player.corrections ? `   ↶ ${player.corrections} ${corrections}` : ''}`;
    return `<g><rect x="60" y="${y - 46}" width="960" height="78" rx="18" fill="#111827" stroke="#334155"/><circle cx="92" cy="${y - 7}" r="10" fill="${['#72d17b','#22d3ee','#fb7185','#fbbf24','#4ade80','#f472b6'][index]}"/><text x="120" y="${y - 13}" fill="#f8fafc" font-size="22" font-weight="700">${escapeXml(player.displayName)}</text><text x="120" y="${y + 14}" fill="#94a3b8" font-size="15">${escapeXml(player.commander)}</text><text x="650" y="${y}" fill="#cbd5e1" font-size="16">${escapeXml(metrics)}</text><text x="970" y="${y + 3}" text-anchor="end" fill="#f8fafc" font-size="34" font-weight="900">${player.finalLife}</text></g>`;
  }).join('');
  const height = 290 + recap.players.slice(0, 6).length * 94;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}" viewBox="0 0 1080 ${height}"><rect width="1080" height="${height}" fill="#05070b"/><circle cx="920" cy="80" r="180" fill="#052e16" opacity=".75"/><text x="60" y="72" fill="#6ee7b7" font-family="sans-serif" font-size="22" font-weight="800" letter-spacing="3">MTG TRACKER &amp; ANALYTICS</text><text x="60" y="126" fill="#f8fafc" font-family="sans-serif" font-size="42" font-weight="900">${title}</text><text x="60" y="168" fill="#94a3b8" font-family="sans-serif" font-size="18">${formatDuration(recap.durationSeconds)} · ${first}: ${escapeXml(recap.startingPlayerName ?? '—')} · ${direction}</text><g font-family="sans-serif">${rows}</g></svg>`;
}
