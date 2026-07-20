import type {
  PersonalDeckSnapshot,
  PersonalMatchParticipantRow,
} from '@/lib/personal-analytics';

export type PersonalAnalyticsFact = {
  is_winner: boolean;
  deck_id: string;
  played_at: string | null;
  name: string;
  commander: string;
  commander_image: string | null;
  color_identity: string[] | null;
  bracket: string | null;
  source_type: string | null;
  source_url: string | null;
  owner_username: string | null;
};

type AnalyticsRpcClient = {
  rpc(
    name: string,
    args?: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

export function buildPersonalAnalyticsInputs(facts: PersonalAnalyticsFact[]) {
  const participants: PersonalMatchParticipantRow[] = facts.map((fact) => ({
    is_winner: fact.is_winner,
    deck_id: fact.deck_id,
    played_at: fact.played_at,
  }));
  const decksById = new Map<string, PersonalDeckSnapshot>();
  facts.forEach((fact) => {
    if (decksById.has(fact.deck_id)) return;
    decksById.set(fact.deck_id, {
      id: fact.deck_id,
      name: fact.name,
      commander: fact.commander,
      commander_image: fact.commander_image,
      color_identity: fact.color_identity,
      bracket: fact.bracket,
      source_type: fact.source_type,
      source_url: fact.source_url,
      ownerUsername: fact.owner_username,
    });
  });
  return { participants, decksById };
}

export async function fetchPersonalAnalyticsInputs(
  client: AnalyticsRpcClient,
  userId: string,
) {
  const { data, error } = await client.rpc('get_personal_analytics_facts', {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message || 'Failed to fetch personal analytics');
  return buildPersonalAnalyticsInputs((data || []) as PersonalAnalyticsFact[]);
}

export async function fetchGlobalAnalyticsInputs(client: AnalyticsRpcClient) {
  const { data, error } = await client.rpc('get_global_analytics_facts');
  if (error) throw new Error(error.message || 'Failed to fetch global analytics');
  return buildPersonalAnalyticsInputs((data || []) as PersonalAnalyticsFact[]);
}
