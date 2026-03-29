'use client';

import { useSession, signOut } from 'next-auth/react';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { useUserSummary } from '@/hooks/use-balances';
import { User, Shield, Bell, Palette, CreditCard, HelpCircle, Info, LogOut, ChevronRight, Moon, Sun, Monitor, Plus, Users, HandCoins, ScanLine } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type Theme = 'light' | 'dark' | 'system';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border-light)]">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{title}</h2>
      </div>
      <div className="divide-y divide-[var(--border-light)]">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value, onClick, destructive }: { icon: React.ElementType; label: string; value?: string; onClick?: () => void; destructive?: boolean }) {
  return (
    <button onClick={onClick} disabled={!onClick}
      className={cn('w-full flex items-center gap-3 px-4 py-3.5 min-h-[52px] text-left transition-colors', onClick && 'hover:bg-[var(--hover)] active:bg-[var(--subtle)]', destructive && 'text-debit')}>
      <Icon className={cn('w-4 h-4 shrink-0', destructive ? 'text-debit' : 'text-[var(--muted-foreground)]')} />
      <span className={cn('flex-1 text-sm font-medium', destructive ? 'text-debit' : 'text-[var(--foreground)]')}>{label}</span>
      {value && <span className="text-sm text-[var(--text-muted)]">{value}</span>}
      {onClick && !destructive && <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />}
    </button>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { data: summary } = useUserSummary();
  const router = useRouter();
  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';
  const net = (summary?.totalOwedInPaise ?? 0) - (summary?.totalOwingInPaise ?? 0);

  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const stored = localStorage.getItem('kharcha:theme') as Theme | null;
    if (stored) setTheme(stored);
    else if (document.documentElement.classList.contains('dark')) setTheme('dark');
  }, []);

  const applyTheme = (t: Theme) => {
    setTheme(t);
    localStorage.setItem('kharcha:theme', t);
    const root = document.documentElement;
    if (t === 'dark') root.classList.add('dark');
    else if (t === 'light') root.classList.remove('dark');
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  };

  const themeOptions = [
    { value: 'light' as Theme, icon: Sun, label: 'Light' },
    { value: 'dark' as Theme, icon: Moon, label: 'Dark' },
    { value: 'system' as Theme, icon: Monitor, label: 'System' },
  ];

  return (
    <div className="p-5 md:p-6 max-w-xl mx-auto space-y-4">
      {/* Profile */}
      <div className="card-surface p-6 flex flex-col items-center text-center">
        <MemberAvatar name={userName} avatarUrl={session?.user?.image} size="lg" />
        <p className="text-lg font-semibold text-[var(--foreground)] mt-3">{userName}</p>
        <p className="text-sm text-[var(--text-muted)]">{userEmail}</p>
      </div>

      {/* Balance summary */}
      <div className="card-surface p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)]">Net Balance</p>
          <Amount paise={net} showSign colorize size="lg" />
        </div>
        <Button variant="secondary" size="sm" onClick={() => router.push('/groups')}>View Details</Button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Plus, label: 'Add Expense', href: '/groups' },
          { icon: Users, label: 'New Group', href: '/groups/new' },
          { icon: HandCoins, label: 'Settle Up', href: '/groups' },
          { icon: ScanLine, label: 'Scan', href: '/groups' },
        ].map((a) => (
          <button key={a.label} onClick={() => router.push(a.href)} className="card-interactive p-4 flex flex-col items-center gap-2 min-h-[80px]">
            <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center">
              <a.icon className="w-5 h-5 text-brand" />
            </div>
            <span className="text-xs font-medium text-[var(--foreground)]">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Settings sections */}
      <Section title="Account & Security">
        <Row icon={User} label="Edit Profile" value="Coming soon" />
        <Row icon={Shield} label="Change Password" value="Coming soon" />
      </Section>

      <Section title="Notifications">
        <Row icon={Bell} label="Preferences" value="Coming soon" />
      </Section>

      <Section title="Appearance">
        <div className="px-4 py-3.5">
          <p className="text-sm font-medium text-[var(--foreground)] mb-3">Theme</p>
          <div className="flex gap-2">
            {themeOptions.map((opt) => (
              <button key={opt.value} onClick={() => applyTheme(opt.value)}
                className={cn('flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all min-h-[44px]',
                  theme === opt.value ? 'border-brand bg-brand-light text-brand' : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted)]')}>
                <opt.icon className="w-4 h-4" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Payment Methods">
        <Row icon={CreditCard} label="Saved Methods" value="Coming soon" />
      </Section>

      <Section title="Help & Support">
        <Row icon={HelpCircle} label="FAQ" />
        <Row icon={Info} label="About Kharcha" value="v0.1.0" />
      </Section>

      <div className="card-surface overflow-hidden">
        <Row icon={LogOut} label="Sign Out" destructive onClick={() => signOut({ callbackUrl: '/login' })} />
      </div>
    </div>
  );
}
