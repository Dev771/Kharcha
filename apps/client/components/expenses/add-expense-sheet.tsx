'use client';

import { useState } from 'react';
import { toPaise, EXPENSE_CATEGORIES } from '@kharcha/shared';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { AmountInput } from '@/components/ui/amount-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { useCreateExpense } from '@/hooks/use-expenses';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

interface Member { userId: string; user: { id: string; name: string } }

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  members: Member[];
  currentUserId: string;
}

const splitTypes = [
  { key: 'EQUAL', label: 'Equal' },
  { key: 'EXACT', label: 'Exact' },
  { key: 'PERCENTAGE', label: '%' },
  { key: 'SHARES', label: 'Shares' },
] as const;

export function AddExpenseSheet({ open, onClose, groupId, members, currentUserId }: Props) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [splitType, setSplitType] = useState<string>('EQUAL');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidById, setPaidById] = useState(currentUserId);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(members.map((m) => m.userId));
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const mutation = useCreateExpense(groupId);

  const toggleMember = (uid: string) => {
    setSelectedMembers((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);
  };

  const handleSubmit = async () => {
    if (!description.trim() || !amount || selectedMembers.length === 0) return;
    const amountInPaise = toPaise(parseFloat(amount));

    const splits = selectedMembers.map((uid) => {
      let val = splitValues[uid];
      const entry: { userId: string; value?: number } = { userId: uid };

      if (splitType === 'EXACT' && !val) {
        const filled = selectedMembers.filter((id) => id !== uid && splitValues[id] && parseFloat(splitValues[id]) > 0);
        if (filled.length === selectedMembers.length - 1) {
          const sum = filled.reduce((s, id) => s + (parseFloat(splitValues[id] || '0') || 0), 0);
          const rem = parseFloat(amount) - sum;
          if (rem > 0) val = rem.toString();
        }
      }

      if (splitType === 'EXACT' && val) entry.value = toPaise(parseFloat(val));
      else if ((splitType === 'PERCENTAGE' || splitType === 'SHARES') && val) entry.value = parseFloat(val);
      return entry;
    });

    try {
      await mutation.mutateAsync({ amountInPaise, description: description.trim(), splitType, date, paidById, splits, category: category || undefined });
      toast.success(`Expense added · ₹${amount}`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add expense');
    }
  };

  const perPerson = selectedMembers.length > 0 && amount ? (parseFloat(amount) / selectedMembers.length).toFixed(2) : '0.00';

  return (
    <BottomSheet open={open} onClose={onClose} title="Add Expense">
      <div className="space-y-5">
        {/* Hero amount */}
        <AmountInput value={amount} onChange={setAmount} autoFocus />

        {/* Description */}
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this for?" label="Description *" />

        {/* Category chips */}
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">Category</label>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5">
            {EXPENSE_CATEGORIES.map((c) => (
              <Chip key={c} label={c} selected={category === c} onClick={() => setCategory(category === c ? '' : c)} />
            ))}
          </div>
        </div>

        {/* Date + Paid by */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">Paid by</label>
            <select value={paidById} onChange={(e) => setPaidById(e.target.value)} className="select-field">
              {members.map((m) => <option key={m.userId} value={m.userId}>{m.user.name}</option>)}
            </select>
          </div>
        </div>

        {/* Split type */}
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">
            Split type {splitType === 'EQUAL' && amount && `· ₹${perPerson} each`}
          </label>
          <div className="flex gap-1 p-1 rounded-xl bg-[var(--subtle)]">
            {splitTypes.map((st) => (
              <button key={st.key} type="button" onClick={() => setSplitType(st.key)}
                className={cn('flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all min-h-[36px]',
                  splitType === st.key ? 'bg-brand text-white shadow-sm' : 'text-[var(--muted-foreground)]')}>
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Members with split values */}
        <div className="space-y-2">
          {members.map((m) => {
            const isSelected = selectedMembers.includes(m.userId);
            return (
              <div key={m.userId} className="flex items-center gap-3">
                <button type="button" onClick={() => toggleMember(m.userId)}
                  className={cn('w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all',
                    isSelected ? 'bg-brand/20 border-brand/40 text-brand' : 'border-[var(--border)] text-transparent')}>
                  <Check className="w-3 h-3" />
                </button>
                <MemberAvatar name={m.user.name} size="xs" />
                <span className="text-sm text-[var(--foreground)] flex-1 truncate">{m.user.name}</span>
                {splitType !== 'EQUAL' && isSelected && (
                  <input type="number" inputMode="decimal" step="any" min="0"
                    value={splitValues[m.userId] || ''}
                    onChange={(e) => setSplitValues((p) => ({ ...p, [m.userId]: e.target.value }))}
                    placeholder={splitType === 'EXACT' ? '₹' : splitType === 'PERCENTAGE' ? '%' : 'shares'}
                    className="input-field w-20 text-right text-xs py-2" />
                )}
              </div>
            );
          })}
        </div>

        {/* Validation hints */}
        {splitType === 'EXACT' && amount && (() => {
          const total = parseFloat(amount) || 0;
          const filled = selectedMembers.reduce((s, uid) => s + (parseFloat(splitValues[uid] || '0') || 0), 0);
          const diff = total - filled;
          if (filled > 0 && Math.abs(diff) > 0.01 && diff !== total) {
            return <p className={cn('text-xs', diff < 0 ? 'text-debit' : 'text-warning')}>
              {diff > 0 ? `₹${diff.toFixed(2)} remaining` : `₹${Math.abs(diff).toFixed(2)} over`}
            </p>;
          }
          return null;
        })()}
        {splitType === 'PERCENTAGE' && (() => {
          const total = selectedMembers.reduce((s, uid) => s + (parseFloat(splitValues[uid] || '0') || 0), 0);
          if (total > 0 && Math.abs(total - 100) > 0.01) return <p className="text-xs text-debit">Total: {total.toFixed(1)}% — must equal 100%</p>;
          return null;
        })()}

        {/* Submit */}
        <Button variant="primary" size="lg" className="w-full" onClick={handleSubmit}
          loading={mutation.isPending} disabled={!description.trim() || !amount || selectedMembers.length === 0}>
          {amount ? `Add Expense · ₹${amount}` : 'Add Expense'}
        </Button>
      </div>
    </BottomSheet>
  );
}
