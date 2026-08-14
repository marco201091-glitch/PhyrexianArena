import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ARENA_SEASON_MONTHS } from '@/lib/arena-seasons';

type ArenaSeasonSettingsLabels = {
  enabled: string;
  enabledHint: string;
  startMonth: string;
  resetHint: string;
};

export function ArenaSeasonSettings({
  enabled,
  resetMonth,
  locale,
  labels,
  onEnabledChange,
  onResetMonthChange,
}: {
  enabled: boolean;
  resetMonth: number;
  locale: string;
  labels: ArenaSeasonSettingsLabels;
  onEnabledChange: (enabled: boolean) => void;
  onResetMonthChange: (month: number) => void;
}) {
  return (
    <>
      <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/30 p-3">
        <Checkbox
          id="arena-seasons-enabled"
          checked={enabled}
          onCheckedChange={(checked) => onEnabledChange(checked === true)}
        />
        <div className="space-y-1">
          <label htmlFor="arena-seasons-enabled" className="text-sm font-medium text-foreground">
            {labels.enabled}
          </label>
          <p className="text-xs text-muted-foreground">{labels.enabledHint}</p>
        </div>
      </div>
      {enabled ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{labels.startMonth}</label>
          <Select value={String(resetMonth)} onValueChange={(value) => onResetMonthChange(Number(value))}>
            <SelectTrigger className="border-border bg-background/50 text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-card">
              {ARENA_SEASON_MONTHS.map((month) => (
                <SelectItem key={month} value={String(month)}>
                  {new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' })
                    .format(new Date(Date.UTC(2026, month - 1, 1)))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{labels.resetHint}</p>
        </div>
      ) : null}
    </>
  );
}
