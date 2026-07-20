'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AppLoader } from '@/components/ui/app-loader';
import { ManaLogo } from '@/components/ui/mana-logo';
import { AppProfileButton } from '@/components/navigation/app-profile-button';
import { MotionItem, MotionList, MotionPanel } from '@/components/ui/motion';
import { useLanguage } from '@/components/language-provider';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';
import { deckHasColorIdentity, getDeckDisplayColors } from '@/lib/deck-metadata';
import { syncDeckCommanderColors } from '@/lib/deck-color-sync';
import { runWhenIdle } from '@/lib/idle-work';
import {
  buildPersonalAnalytics,
  emptyPersonalAnalytics,
  type PersonalAnalytics,
} from '@/lib/personal-analytics';
import { fetchPersonalAnalyticsInputs } from '@/lib/personal-analytics-query';
import { DeckImage } from '@/components/deck-image';
import { getSupabaseErrorMessage } from '@/lib/supabase-errors';
import { isDemoUser } from '@/lib/demo';
import { fetchGroupByInviteCode, normalizeInviteCode } from '@/lib/join-arena';

import { MANA_COLOR_LABELS } from '@/lib/mana-colors';
import { ManaColorBadge, ManaColorPills } from '@/components/ui/mana-color-pills';
import { ModalCard, ModalOverlay } from '@/components/ui/modal-shell';
import { PanelWithActions } from '@/components/ui/panel-with-actions';
import {
  Plus,
  Users,
  Hash,
  Copy,
  LogOut,
  Skull,

  ArrowRight,
  CalendarDays,
  Trophy,
  Palette,
  BarChart3,

  ScrollText,
} from 'lucide-react';
import Link from 'next/link';

interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
  profiles: { username: string; display_name: string | null };
  group_members: Array<{ user_id: string }>;
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { adminMode } = usePlatformAdmin();
  const router = useRouter();
  const { toast } = useToast();
  const { copy: t } = useLanguage();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [joiningCode, setJoiningCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [personalAnalytics, setPersonalAnalytics] = useState<PersonalAnalytics | null>(null);


  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const fetchGroups = useCallback(async () => {
    if (!user) return;

    try {
      if (adminMode) {
        const { data } = await supabase
          .from('groups')
          .select(`
            *,
            profiles:created_by (username, display_name),
            group_members (user_id)
          `)
          .order('created_at', { ascending: false });

        setGroups(data as unknown as Group[] || []);
        setLoading(false);
        return;
      }

      const { data: memberData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user!.id);

      if (!memberData || memberData.length === 0) {
        setLoading(false);
        return;
      }

      const groupIds = (memberData as { group_id: string }[]).map((m) => m.group_id);

      const { data } = await supabase
        .from('groups')
        .select(`
          *,
          profiles:created_by (username, display_name),
          group_members (user_id)
        `)
        .in('id', groupIds)
        .order('created_at', { ascending: false });

      setGroups(data as unknown as Group[] || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  }, [adminMode, user]);

  const fetchPersonalAnalytics = useCallback(async () => {
    if (!user) return;

    try {
      if (adminMode) {
        const response = await fetch('/api/admin/global-analytics');
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(typeof payload.error === 'string' ? payload.error : 'Failed to fetch global analytics');
        }

        setPersonalAnalytics(payload.analytics ?? null);
        return;
      }

      const { participants, decksById } = await fetchPersonalAnalyticsInputs(supabase, user.id);
      if (decksById.size === 0) {
        setPersonalAnalytics(emptyPersonalAnalytics());
        return;
      }

      const colorOverrides = new Map<string, string[]>();
      decksById.forEach((deck, deckId) => {
        const colors = getDeckDisplayColors(deck);
        if (colors.length > 0) {
          colorOverrides.set(deckId, colors);
        }
      });

      setPersonalAnalytics(buildPersonalAnalytics(participants, decksById, colorOverrides));

      const decksMissingColors = Array.from(decksById.values()).filter((deck) =>
        !deckHasColorIdentity(deck) && Boolean(deck.commander?.trim())
      );

      if (decksMissingColors.length > 0) {
        runWhenIdle(async () => {
          const resolved = await syncDeckCommanderColors(
            decksMissingColors.map((deck) => ({
              id: deck.id,
              commander: deck.commander,
              source_type: deck.source_type,
              source_url: deck.source_url,
              color_identity: deck.color_identity,
            })),
            Object.fromEntries(colorOverrides),
            5,
          );

          if (resolved.size === 0) return;

          const enrichedOverrides = new Map(colorOverrides);
          resolved.forEach((colors, deckId) => {
            if (colors.length > 0) {
              enrichedOverrides.set(deckId, colors);
            }
          });

          setPersonalAnalytics(buildPersonalAnalytics(participants, decksById, enrichedOverrides));
        }, { timeoutMs: 5000 });
      }
    } catch (error) {
      console.error(
        'Error fetching personal analytics:',
        getSupabaseErrorMessage(error, 'Failed to fetch personal analytics'),
      );
      setPersonalAnalytics(null);
    }
  }, [adminMode, user]);

  useEffect(() => {
    if (user) {
      fetchGroups();
      fetchPersonalAnalytics();
    }
  }, [user, fetchGroups, fetchPersonalAnalytics]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('groups')
        .insert({
          name: newGroupName,
          description: newGroupDescription || null,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;

      setGroups([data as unknown as Group, ...groups]);
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDescription('');

      toast({
        title: t({ it: 'Arena creata!', en: 'Arena created!' }),
        description: t({ it: 'Condividi il codice invito con il tuo gruppo', en: 'Share the invite code with your playgroup' }),
      });

      fetchGroups();
    } catch (error: unknown) {
      console.error('Create group error:', error);
      const message =
        error instanceof Error
          ? error.message
          : error && typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : t({ it: 'Creazione arena non riuscita', en: 'Failed to create arena' });

      toast({
        title: t({ it: 'Errore', en: 'Error' }),
        description: message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };



  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joiningCode.trim() || !user) return;

    if (isDemoUser(user)) {
      toast({
        title: t({ it: 'Account demo', en: 'Demo account' }),
        description: t({
          it: 'L\'account demo non puo unirsi ad arene reali. Crea la tua arena demo dalla dashboard.',
          en: 'The demo account cannot join real arenas. Create your own demo arena from the dashboard.',
        }),
        variant: 'destructive',
      });
      return;
    }

    setJoining(true);
    try {
      const group = await fetchGroupByInviteCode(supabase, joiningCode);

      if (!group) {
        toast({
          title: t({ it: 'Codice non valido', en: 'Invalid code' }),
          description: t({ it: 'Nessuna arena trovata con questo codice', en: 'No arena found with that invite code' }),
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: t({ it: 'Sei gia membro', en: 'Already a member' }),
            description: t({ it: 'Ti porto all\'arena...', en: 'Redirecting to arena...' }),
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: t({ it: 'Entrato!', en: 'Joined!' }),
          description: t({ it: `Benvenuto in "${group.name}"`, en: `Welcome to "${group.name}"` }),
        });
      }

      setShowJoinModal(false);
      setJoiningCode('');
      router.push(`/table/${group.id}`);
    } catch (error: unknown) {
      toast({
        title: t({ it: 'Errore', en: 'Error' }),
        description: getSupabaseErrorMessage(
          error,
          t({ it: 'Ingresso nell\'arena non riuscito', en: 'Failed to join arena' }),
        ),
        variant: 'destructive',
      });
    } finally {
      setJoining(false);
    }
  };

  const copyInviteCode = (code: string) => {
    const url = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(url);
    toast({
      title: t({ it: 'Copiato!', en: 'Copied!' }),
      description: t({ it: 'Link invito copiato negli appunti', en: 'Invite link copied to clipboard' }),
    });
  };

  const formatArenaDate = (date: string) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(date));
    } catch {
      return '';
    }
  };

  if (authLoading || loading) {
    return <AppLoader label={t({ it: 'Caricamento...', en: 'Loading...' })} />;
  }

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden">
      <header className="safe-top border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
          <ManaLogo size="md" showText />
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            {adminMode && (
              <Link href="/admin/access-logs">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={t({ it: 'Log accessi', en: 'Access logs' })}
                >
                  <ScrollText className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <AppProfileButton />
            <Button
              variant="ghost"
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground px-2 sm:px-4"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t({ it: 'Esci', en: 'Exit' })}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-7xl px-3 py-5 sm:px-4 sm:py-8">
        <PanelWithActions
          variant="strong"
          className="mb-6 sm:mb-8"
          actions={(
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setJoiningCode('');
                  setShowJoinModal(true);
                }}
                className="flex-1 border-border text-foreground hover:bg-accent"
              >
                <Hash className="mr-2 h-4 w-4" />
                {t({ it: 'Entra in arena', en: 'Join Arena' })}
              </Button>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t({ it: 'Crea arena', en: 'Create Arena' })}
              </Button>
            </>
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">{t({ it: 'Le tue arene', en: 'Your Arenas' })}</h2>
            {adminMode && (
              <span className="rounded-full border border-violet-500/30 bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300">
                {t({ it: 'Vista amministratore', en: 'Admin view' })}
              </span>
            )}
          </div>
          <p className="text-muted-foreground">{t({ it: 'Crea o entra in un\'arena per tracciare le partite', en: 'Create or join an arena to track your battles' })}</p>
        </PanelWithActions>

        {groups.length === 0 ? (
          <Card className="bg-card/50 border-border">
            <CardContent className="py-12 text-center">
              <Skull className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">{t({ it: 'Nessuna arena', en: 'No arenas yet' })}</h3>
              <p className="text-muted-foreground mb-4">
                {t({ it: 'Crea un\'arena per iniziare a tracciare le partite del tuo gruppo', en: 'Create an arena to begin tracking battles with your playgroup' })}
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t({ it: 'Crea la prima arena', en: 'Create Your First Arena' })}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <MotionList className="grid gap-5 lg:grid-cols-2">
            {groups.map((group) => (
              <MotionItem
                key={group.id}
              >
                <Card
                  className="group relative h-full cursor-pointer overflow-hidden border-border/70 bg-card/70 shadow-xl shadow-black/25 transition-all hover:border-violet-400/60 hover:bg-card/85 hover:shadow-violet-950/30"
                  onClick={() => router.push(`/table/${group.id}`)}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/70 to-transparent" />
                  <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl transition-opacity group-hover:opacity-90" />
                  <CardHeader className="space-y-4 p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-violet-300/85">
                          <span>{t({ it: 'Arena', en: 'Arena' })}</span>
                          <span className="h-1 w-1 rounded-full bg-violet-300/70" />
                          <span>{group.group_members?.length || 0} {t({ it: 'giocatori', en: 'players' })}</span>
                        </div>
                        <CardTitle className="text-2xl font-bold leading-tight text-foreground transition-colors group-hover:text-violet-200 sm:text-3xl">
                        {group.name}
                        </CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t({ it: 'Copia link invito', en: 'Copy invite link' })}
                        className="shrink-0 text-muted-foreground hover:bg-violet-500/10 hover:text-violet-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyInviteCode(group.invite_code);
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    {group.description && (
                      <CardDescription className="max-w-2xl break-words text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {group.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-md border border-border/70 bg-background/35 p-3">
                        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {t({ it: 'Tavolo', en: 'Table' })}
                        </div>
                        <div className="text-lg font-semibold text-foreground">
                          {group.group_members?.length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">{t({ it: 'giocatori', en: 'players' })}</div>
                      </div>
                      <div className="rounded-md border border-border/70 bg-background/35 p-3">
                        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          <Hash className="h-3.5 w-3.5" />
                          {t({ it: 'Invito', en: 'Invite' })}
                        </div>
                        <div className="break-all font-mono text-lg font-semibold text-violet-200">
                          {group.invite_code}
                        </div>
                      </div>
                      <div className="rounded-md border border-border/70 bg-background/35 p-3">
                        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {t({ it: 'Creata', en: 'Created' })}
                        </div>
                        <div className="text-sm font-medium text-foreground">
                          {formatArenaDate(group.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t({ it: 'Apri cronologia, ranking e record battle', en: 'Open history, rankings, and record battle' })}
                      </span>
                      <Button
                        type="button"
                        className="w-full shrink-0 bg-gradient-to-r from-violet-600 to-purple-700 text-white hover:from-violet-700 hover:to-purple-800 sm:w-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/table/${group.id}`);
                        }}
                      >
                        {t({ it: 'Apri', en: 'Open' })}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </MotionItem>
            ))}
          </MotionList>
        )}

        <section className="mt-8 min-w-0 max-w-full sm:mt-10">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {adminMode
                  ? t({ it: 'Insights globali', en: 'Global Insights' })
                  : t({ it: 'Analytics personali', en: 'Personal Analytics' })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {adminMode
                  ? t({
                    it: 'Mazzi giocati dagli utenti reali (esclusi admin, usertest e demo).',
                    en: 'Decks played by real users (excluding admin, usertest, and demo).',
                  })
                  : t({ it: 'Solo mazzi che hai giocato almeno una volta.', en: 'Only decks you have played at least once.' })}
              </p>
            </div>
          </div>

          {!personalAnalytics || personalAnalytics.gamesPlayed === 0 ? (
            <Card className="border-border/70 bg-card/50">
              <CardContent className="py-8 text-center">
                <BarChart3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <h3 className="mb-1 text-base font-semibold text-foreground">
                  {adminMode
                    ? t({ it: 'Nessun dato globale ancora', en: 'No global data yet' })
                    : t({ it: 'Nessun dato personale ancora', en: 'No personal data yet' })}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {adminMode
                    ? t({ it: 'Quando gli utenti registreranno partite con i loro mazzi, vedrai qui statistiche aggregate.', en: 'When users record matches with their decks, aggregated stats will appear here.' })
                    : t({ it: 'Registra una partita con uno dei tuoi mazzi per vedere statistiche e colori preferiti.', en: 'Record a match with one of your decks to see stats and favorite colors.' })}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid min-w-0 max-w-full gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
              <Card className="min-w-0 max-w-full overflow-hidden border-border/70 bg-card/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Trophy className="h-5 w-5 text-violet-300" />
                    {t({ it: 'Top 10 mazzi', en: 'Top 10 Decks' })}
                  </CardTitle>
                  <CardDescription>
                    {t({ it: 'Ordinati per partite giocate, poi vittorie.', en: 'Sorted by games played, then wins.' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {personalAnalytics.topDecks.map((deck, index) => (
                      <div key={deck.id} className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/35 p-3 sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-3">
                        <div className="flex w-full min-w-0 items-center gap-3 sm:block sm:w-auto">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-sm font-bold text-violet-200">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1 sm:hidden">
                            <p className="truncate font-semibold text-foreground">{deck.name}</p>
                            {adminMode && deck.ownerUsername ? (
                              <p className="truncate text-xs text-muted-foreground">@{deck.ownerUsername}</p>
                            ) : null}
                            <p className="truncate text-sm text-violet-300">{deck.commander}</p>
                          </div>
                          <div className="ml-auto shrink-0 text-right text-sm sm:hidden">
                            <p className="font-semibold text-foreground">{deck.gamesPlayed}G / {deck.wins}W</p>
                            <p className="text-xs text-muted-foreground">{deck.winRate}% {t({ it: 'win', en: 'win' })}</p>
                          </div>
                        </div>
                        <div className="hidden min-w-0 sm:block">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold text-foreground">{deck.name}</p>
                            <ManaColorPills colors={deck.colors} size="xs" gap="tight" />
                          </div>
                          {adminMode && deck.ownerUsername ? (
                            <p className="truncate text-xs text-muted-foreground">@{deck.ownerUsername}</p>
                          ) : null}
                          <p className="truncate text-sm text-violet-300">{deck.commander}</p>
                        </div>
                        <ManaColorPills colors={deck.colors} size="xs" gap="tight" className="sm:hidden" />
                        <div className="hidden text-right sm:block">
                          <p className="text-sm font-semibold text-foreground">{deck.gamesPlayed}G / {deck.wins}W</p>
                          <p className="text-xs text-muted-foreground">{deck.winRate}% {t({ it: 'win', en: 'win' })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="min-w-0 max-w-full space-y-5">
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
                  <Card className="border-border/70 bg-card/60">
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t({ it: 'Partite', en: 'Games' })}</p>
                      <p className="mt-1 text-2xl font-bold text-foreground">{personalAnalytics.gamesPlayed}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/70 bg-card/60">
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t({ it: 'Mazzi', en: 'Decks' })}</p>
                      <p className="mt-1 text-2xl font-bold text-foreground">{personalAnalytics.uniqueDecks}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/70 bg-card/60">
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t({ it: 'Vittorie', en: 'Wins' })}</p>
                      <p className="mt-1 text-2xl font-bold text-foreground">{personalAnalytics.wins}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/70 bg-card/60">
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t({ it: 'Win rate', en: 'Win rate' })}</p>
                      <p className="mt-1 text-2xl font-bold text-foreground">
                        {Math.round((personalAnalytics.wins / personalAnalytics.gamesPlayed) * 100)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/70 bg-card/60">
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t({ it: 'Streak attuale', en: 'Current streak' })}</p>
                      <p className={`mt-1 text-2xl font-bold ${personalAnalytics.currentWinStreak > 0 ? 'text-emerald-400' : 'text-foreground'}`}>
                        {personalAnalytics.currentWinStreak > 0 ? `${personalAnalytics.currentWinStreak}W` : '0'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/70 bg-card/60">
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t({ it: 'Streak migliore', en: 'Best streak' })}</p>
                      <p className={`mt-1 text-2xl font-bold ${personalAnalytics.longestWinStreak > 0 ? 'text-amber-300' : 'text-foreground'}`}>
                        {personalAnalytics.longestWinStreak > 0 ? `${personalAnalytics.longestWinStreak}W` : '0'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {personalAnalytics.bestDeck ? (
                  <Card className="border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-card/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-foreground">
                        {t({ it: 'Miglior mazzo', en: 'Best deck' })}
                      </CardTitle>
                      <CardDescription>
                        {t({ it: 'Min. 3 partite · win rate piu alto', en: 'Min. 3 games · highest win rate' })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex min-w-0 items-center gap-3 rounded-md border border-border/60 bg-background/35 p-3">
                        <DeckImage
                          src={personalAnalytics.bestDeck.commanderImage}
                          alt={personalAnalytics.bestDeck.commander}
                          className="h-14 w-14 shrink-0 rounded object-cover object-top"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold text-foreground">{personalAnalytics.bestDeck.name}</p>
                            <ManaColorPills colors={personalAnalytics.bestDeck.colors} size="xs" gap="tight" />
                          </div>
                          <p className="truncate text-sm text-violet-300">{personalAnalytics.bestDeck.commander}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {personalAnalytics.bestDeck.gamesPlayed}G / {personalAnalytics.bestDeck.wins}W
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {personalAnalytics.bestDeck.winRate}% {t({ it: 'win', en: 'win' })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {personalAnalytics.colorWinStats.length > 0 ? (
                  <Card className="border-border/70 bg-card/60">
                    <CardHeader>
                      <CardTitle className="text-base text-foreground">
                        {t({ it: 'Win rate per colore', en: 'Win rate by color' })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {personalAnalytics.colorWinStats.map((stat) => {
                          const label = MANA_COLOR_LABELS[stat.color] || MANA_COLOR_LABELS.C;
                          return (
                            <div key={`win-${stat.color}`}>
                              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                                <span className="flex items-center gap-2">
                                  <ManaColorBadge color={stat.color} size="sm" />
                                  <span className="font-medium text-foreground">
                                    {t({ it: label.it, en: label.en })}
                                  </span>
                                </span>
                                <span className="text-muted-foreground">{stat.wins}W · {stat.winRate}%</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                                <div className="h-full rounded-full bg-emerald-400/90" style={{ width: `${stat.winRate}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <Card className="border-border/70 bg-card/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Palette className="h-5 w-5 text-violet-300" />
                      {t({ it: 'Colori piu giocati', en: 'Most Played Colors' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {personalAnalytics.colorStats.map((stat) => {
                        const label = MANA_COLOR_LABELS[stat.color] || MANA_COLOR_LABELS.C;
                        return (
                          <div key={stat.color}>
                            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                              <span className="flex items-center gap-2">
                                <ManaColorBadge color={stat.color} size="sm" />
                                <span className="font-medium text-foreground">
                                  {t({ it: label.it, en: label.en })}
                                </span>
                              </span>
                              <span className="text-muted-foreground">{stat.gamesPlayed} / {stat.percentage}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-secondary">
                              <div className="h-full rounded-full bg-violet-400" style={{ width: `${stat.percentage}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </section>
      </main>

      {showJoinModal && (
        <ModalOverlay>
          <ModalCard>
            <CardHeader>
              <CardTitle className="text-foreground">{t({ it: 'Entra in un\'arena', en: 'Join an Arena' })}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t({ it: 'Inserisci il codice invito che ti ha condiviso il creatore dell\'arena.', en: 'Enter the invite code shared by the arena creator.' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinWithCode} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t({ it: 'Codice invito', en: 'Invite code' })}</label>
                  <Input
                    autoFocus
                    value={joiningCode}
                    onChange={(e) => setJoiningCode(e.target.value.toUpperCase())}
                    placeholder={t({ it: 'Es. PHY123', en: 'e.g. PHY123' })}
                    className="bg-background/50 border-border text-foreground placeholder:text-muted-foreground uppercase tracking-widest"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowJoinModal(false);
                      setJoiningCode('');
                    }}
                    className="flex-1 border-border text-foreground"
                  >
                    {t({ it: 'Annulla', en: 'Cancel' })}
                  </Button>
                  <Button
                    type="submit"
                    disabled={joining || !joiningCode.trim()}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800"
                  >
                    {joining ? t({ it: 'Accesso...', en: 'Joining...' }) : t({ it: 'Entra', en: 'Join' })}
                  </Button>
                </div>
              </form>
            </CardContent>
          </ModalCard>
        </ModalOverlay>
      )}

      {showCreateModal && (
        <ModalOverlay>
          <ModalCard>
            <CardHeader>
              <CardTitle className="text-foreground">{t({ it: 'Crea nuova arena', en: 'Create New Arena' })}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t({ it: 'Crea uno spazio per il tuo gruppo di gioco', en: 'Create a battleground for your playgroup' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t({ it: 'Nome arena', en: 'Arena Name' })}</label>
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder={t({ it: 'Partite del venerdi sera', en: 'Friday Night Battles' })}
                    required
                    className="bg-background/50 border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t({ it: 'Descrizione (opzionale)', en: 'Description (optional)' })}</label>
                  <Input
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder={t({ it: 'Partite settimanali al negozio locale', en: 'Weekly games at the local shop' })}
                    className="bg-background/50 border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 border-border text-foreground"
                  >
                    {t({ it: 'Annulla', en: 'Cancel' })}
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800"
                  >
                    {creating ? t({ it: 'Creazione...', en: 'Creating...' }) : t({ it: 'Crea', en: 'Create' })}
                  </Button>
                </div>
              </form>
            </CardContent>
          </ModalCard>
        </ModalOverlay>
      )}
    </div>
  );
}
