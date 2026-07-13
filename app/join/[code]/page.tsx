'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AppLoader } from '@/components/ui/app-loader';
import { ManaLogo } from '@/components/ui/mana-logo';
import { useLanguage } from '@/components/language-provider';
import { Users, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { isDemoUser } from '@/lib/demo';
import { fetchGroupByInviteCode } from '@/lib/join-arena';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { copy: t } = useLanguage();
  const [group, setGroup] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const joinAttemptedRef = useRef(false);

  const inviteCode = params.code as string;

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const groupPreview = await fetchGroupByInviteCode(supabase, inviteCode);

        if (groupPreview) {
          setGroup(groupPreview);
        }
      } catch (error) {
        console.error('Error fetching group:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [inviteCode]);

  const handleJoin = useCallback(async () => {
    if (!user || !group || joinAttemptedRef.current) return;

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

    joinAttemptedRef.current = true;
    setJoining(true);
    try {
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
          title: t({ it: 'Benvenuto!', en: 'Welcome!' }),
          description: t({ it: `Sei entrato in "${group.name}"`, en: `You have entered "${group.name}"` }),
        });
      }

      router.push(`/table/${group.id}`);
    } catch (error: unknown) {
      joinAttemptedRef.current = false;
      toast({
        title: t({ it: 'Errore', en: 'Error' }),
        description: error instanceof Error ? error.message : t({ it: 'Ingresso nell\'arena non riuscito', en: 'Failed to join arena' }),
        variant: 'destructive',
      });
    } finally {
      setJoining(false);
    }
  }, [group, router, t, toast, user]);

  useEffect(() => {
    if (!authLoading && user && group) {
      handleJoin();
    }
  }, [user, authLoading, group, handleJoin]);

  if (loading || authLoading) {
    return <AppLoader label={t({ it: 'Caricamento invito...', en: 'Loading invite...' })} />;
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-foreground">{t({ it: 'Invito non valido', en: 'Invalid Invite' })}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {t({ it: 'Questo link invito non e valido o e scaduto', en: 'This invite link is not valid or has expired' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button className="bg-gradient-to-r from-violet-600 to-purple-700">
                {t({ it: 'Vai alla dashboard', en: 'Go to Dashboard' })}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 border-border">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <ManaLogo size="lg" showText />
            </div>
            <CardTitle className="text-xl font-bold text-foreground mt-2">{t({ it: 'Entra in', en: 'Join' })} {group.name}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {group.description || t({ it: 'Unisciti al tuo gruppo nell\'arena', en: 'Join your playgroup in the arena' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-background/50 border-border">
              <Users className="w-5 h-5 text-violet-400" />
              <span className="text-foreground">{t({ it: 'Hai ricevuto un invito per entrare in un\'arena', en: 'You have been invited to join an arena' })}</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {t({ it: 'Accedi o crea un account per entrare', en: 'Sign in or create an account to join this arena' })}
            </p>
            <div className="flex gap-3">
              <Link href={`/auth/login?redirect=/join/${inviteCode}`} className="flex-1">
                <Button variant="outline" className="w-full border-border text-foreground">
                  {t({ it: 'Accedi', en: 'Sign In' })}
                </Button>
              </Link>
              <Link href={`/auth/register?redirect=/join/${inviteCode}`} className="flex-1">
                <Button className="w-full bg-gradient-to-r from-violet-600 to-purple-700">
                  {t({ it: 'Crea account', en: 'Create Account' })}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/80 border-border">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ManaLogo size="lg" showText />
          </div>
          <CardTitle className="text-foreground mt-2">{t({ it: 'Ingresso in corso:', en: 'Joining' })} {group.name}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {group.description || t({ it: 'Ingresso nell\'arena', en: 'Enter the arena' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-4" />
          <p className="text-muted-foreground">{t({ it: 'Ingresso in corso...', en: 'Joining...' })}</p>
        </CardContent>
      </Card>
    </div>
  );
}
