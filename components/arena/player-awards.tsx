'use client';
import { Crown, Swords, Trophy } from 'lucide-react';
import type { PlayerAward } from '@/lib/player-awards';

const titles: Record<PlayerAward['kind'], string> = { veteran: 'Veterano', eternal_second: 'Eterno secondo', arena_king: "Re dell’arena", hitman: 'Sicario', berserker: 'Berserker', archenemy: 'Archenemy', combo: 'How about a magic trick?', last_standing: 'This will be a slaughter', concession: 'FF at 20', true_skills: 'True display of skills' };
export function PlayerAwards({ awards }: { awards: PlayerAward[] }) {
  const groups = Object.values(awards.reduce((all, award) => { (all[award.kind] ??= []).push(award); return all; }, {} as Record<string, PlayerAward[]>));
  if (!groups.length) return null;
  return <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">{groups.map((group) => <div key={group[0].kind} className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-background/30 p-4"><div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3"><Crown className="h-5 w-5 text-cyan-300"/><div><p className="font-bold text-foreground">{titles[group[0].kind]}</p><p className="text-xs text-cyan-200">Top 3 giocatori</p></div></div>{group.map((award) => <div key={`${award.kind}:${award.rank}:${award.name}`} className="mb-2 flex items-center gap-3 rounded-xl bg-background/45 p-2.5 last:mb-0"><span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-300 text-xs font-black text-slate-950">{award.rank}</span><span className="min-w-0 flex-1 truncate font-semibold text-foreground">{award.name}</span><span className="flex items-center gap-1 font-black text-cyan-200"><Swords className="h-3.5 w-3.5"/>{award.value}{award.kind === 'arena_king' ? '%' : ''}</span></div>)}</div>)}</div>;
}
