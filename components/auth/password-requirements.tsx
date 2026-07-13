'use client';

import { isStrongPassword } from '@/lib/auth-validation';
import { useLanguage } from '@/components/language-provider';

export function usePasswordChecks(password: string) {
  const { copy: t } = useLanguage();

  return [
    {
      valid: password.length >= 8,
      label: t({ it: 'Almeno 8 caratteri', en: 'At least 8 characters' }),
    },
    {
      valid: /[A-Z]/.test(password),
      label: t({ it: 'Una lettera maiuscola', en: 'One uppercase letter' }),
    },
    {
      valid: /[a-z]/.test(password),
      label: t({ it: 'Una lettera minuscola', en: 'One lowercase letter' }),
    },
    {
      valid: /\d/.test(password),
      label: t({ it: 'Un numero', en: 'One number' }),
    },
  ];
}

export function PasswordRequirements({ password }: { password: string }) {
  const checks = usePasswordChecks(password);

  return (
    <div className="grid grid-cols-1 gap-1 pt-1 sm:grid-cols-2">
      {checks.map((check) => (
        <span
          key={check.label}
          className={`text-xs ${check.valid ? 'text-emerald-300' : 'text-muted-foreground'}`}
        >
          {check.valid ? 'OK' : '-'} {check.label}
        </span>
      ))}
    </div>
  );
}

export function isPasswordPolicyValid(password: string) {
  return isStrongPassword(password);
}