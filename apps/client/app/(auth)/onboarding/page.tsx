'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Wallet, BarChart3, Handshake } from 'lucide-react';
import { cn } from '@/lib/utils';

const slides = [
  { icon: Wallet, title: 'Split expenses effortlessly', description: 'Add expenses and split them equally, by exact amounts, percentages, or shares.', color: 'bg-brand' },
  { icon: BarChart3, title: 'Track balances in real-time', description: 'See who owes what at a glance. Balances update instantly as expenses are added.', color: 'bg-credit' },
  { icon: Handshake, title: 'Settle debts with one tap', description: 'Smart settlement suggestions minimize the number of payments needed.', color: 'bg-info' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => setCurrent(Math.round(el.scrollLeft / el.offsetWidth));
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const finish = () => { localStorage.setItem('kharcha:onboarded', 'true'); router.push('/'); };

  const next = () => {
    if (current === slides.length - 1) finish();
    else scrollRef.current?.scrollTo({ left: (current + 1) * (scrollRef.current?.offsetWidth ?? 0), behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col min-h-[80vh]">
      <div className="flex justify-end p-4">
        <button onClick={finish} className="text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] min-h-[44px] px-3">Skip</button>
      </div>

      <div ref={scrollRef} className="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
        {slides.map((s, i) => (
          <div key={i} className="w-full shrink-0 snap-center flex flex-col items-center justify-center px-8 text-center">
            <div className={cn('w-20 h-20 rounded-3xl flex items-center justify-center mb-8', s.color)}>
              <s.icon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-3">{s.title}</h2>
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed max-w-xs">{s.description}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-6 pb-8 px-8">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div key={i} className={cn('h-2 rounded-full transition-all duration-300', i === current ? 'w-6 bg-brand' : 'w-2 bg-[var(--muted)]')} />
          ))}
        </div>
        <Button variant="primary" size="lg" className="w-full" onClick={next}>
          {current === slides.length - 1 ? 'Get Started' : <><span>Next</span> <ArrowRight className="w-4 h-4" /></>}
        </Button>
      </div>
    </div>
  );
}
