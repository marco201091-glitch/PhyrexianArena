# V7 production runbook

Production remains untouched until explicit approval.

1. Freeze writes and take a Supabase backup.
2. Save output of `scripts/release/v7-production-preflight.sql`.
3. Verify local/remote migration history is aligned.
4. Apply committed migrations in timestamp order.
5. Run `scripts/release/v7-production-postflight.sql`.
6. Compare match, participant, game and win totals with preflight.
7. Require `mastery_mismatches = 0`.
8. Verify one old V6 deck: `points = games + 2 × wins`.
9. Verify avatar upload/upsert and public rendering.
10. Verify two authenticated devices receive playgroup deck/catalog updates.
11. Deploy application only after database checks pass.

Rollback for the final hardening migration:
`scripts/release/v7-release-hardening-rollback.sql`.

Mastery has no mutable score column to backfill. It is calculated from permanent
V6/V7 participant facts, preventing drift and preserving every existing game.
