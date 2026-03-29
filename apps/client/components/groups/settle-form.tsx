'use client';

import { useState } from 'react';
import { toPaise, toDisplay } from '@kharcha/shared';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateSettlement } from '@/hooks/use-settlements';
import { toast } from 'sonner';
import { Check } from 'lucide-react';

interface Props {
  groupId: string;
  members: any[];
  prefill?: { fromId: string; toId: string; amountInPaise: number };
  onClose: () => void;
}

export function SettleForm({ groupId, members, prefill, onClose }: Props) {
  const [fromId, setFromId] = useState(prefill?.fromId || '');
  const [toId, setToId] = useState(prefill?.toId || '');
  const [amount, setAmount] = useState(prefill ? toDisplay(prefill.amountInPaise).toString() : '');
  const [note, setNote] = useState('');
  const [success, setSuccess] = useState(false);
  const mutation = useCreateSettlement(groupId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId || !amount) return;
    try {
      await mutation.mutateAsync({ paidById: fromId, paidToId: toId, amountInPaise: toPaise(parseFloat(amount)), note: note || undefined });
      setSuccess(true);
      toast.success('Settlement recorded!');
      setTimeout(onClose, 1200);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record settlement');
    }
  };

  return (
    <BottomSheet open onClose={onClose} title="Record Settlement">
      {success ? (
        <div className="flex flex-col items-center gap-4 py-12 animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-credit-bg flex items-center justify-center">
            <Check className="w-8 h-8 text-credit" />
          </div>
          <p className="text-lg font-semibold text-[var(--foreground)]">Payment Recorded!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">From</label>
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="select-field">
              <option value="">Select payer</option>
              {members.map((m: any) => <option key={m.userId} value={m.userId}>{m.user.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">To</label>
            <select value={toId} onChange={(e) => setToId(e.target.value)} className="select-field">
              <option value="">Select recipient</option>
              {members.filter((m: any) => m.userId !== fromId).map((m: any) => <option key={m.userId} value={m.userId}>{m.user.name}</option>)}
            </select>
          </div>
          <Input label="Amount (₹)" type="number" inputMode="decimal" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} leftAddon="₹" />
          <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., UPI transfer" />
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={mutation.isPending} disabled={!fromId || !toId || !amount}>
            Record Payment
          </Button>
        </form>
      )}
    </BottomSheet>
  );
}
