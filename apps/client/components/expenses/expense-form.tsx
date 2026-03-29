'use client';

import { useState } from 'react';
import { toPaise } from '@kharcha/shared';
import { EXPENSE_CATEGORIES } from '@kharcha/shared';
import { X, Loader2, Check } from 'lucide-react';
import { useCreateExpense } from '@/hooks/use-expenses';
import { cn } from '@/lib/utils';

interface Member {
  userId: string;
  user: { id: string; name: string };
}

interface Props {
  groupId: string;
  members: Member[];
  currentUserId: string;
  onClose: () => void;
}

const splitTypes = [
  { key: 'EQUAL', label: 'Equal' },
  { key: 'EXACT', label: 'Exact' },
  { key: 'PERCENTAGE', label: 'Percentage' },
  { key: 'SHARES', label: 'Shares' },
] as const;

export function ExpenseForm({
  groupId,
  members,
  currentUserId,
  onClose,
}: Props) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [splitType, setSplitType] = useState<string>('EQUAL');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidById, setPaidById] = useState(currentUserId);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    members.map((m) => m.userId),
  );
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const mutation = useCreateExpense(groupId);

  const toggleMember = (uid: string) => {
    setSelectedMembers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || selectedMembers.length === 0) return;

    const amountInPaise = toPaise(parseFloat(amount));

    const splits = selectedMembers.map((uid) => {
      let val = splitValues[uid];
      const entry: { userId: string; value?: number } = { userId: uid };

      // For EXACT: auto-compute remaining for the last unfilled member
      if (splitType === 'EXACT' && !val) {
        const filledOthers = selectedMembers.filter(
          (id) => id !== uid && splitValues[id] && parseFloat(splitValues[id]) > 0,
        );
        if (filledOthers.length === selectedMembers.length - 1) {
          const filledSum = filledOthers.reduce(
            (sum, id) => sum + (parseFloat(splitValues[id] || '0') || 0),
            0,
          );
          const remaining = parseFloat(amount) - filledSum;
          if (remaining > 0) val = remaining.toString();
        }
      }

      if (splitType === 'EXACT' && val) {
        entry.value = toPaise(parseFloat(val));
      } else if (
        (splitType === 'PERCENTAGE' || splitType === 'SHARES') &&
        val
      ) {
        entry.value = parseFloat(val);
      }
      return entry;
    });

    await mutation.mutateAsync({
      amountInPaise,
      description: description.trim(),
      splitType,
      date,
      paidById,
      splits,
      category: category || undefined,
    });

    setSuccess(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 overflow-y-auto anim-slide-in">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-100">
              Add Expense
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-4 py-12 anim-fade-up">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-lg font-semibold text-zinc-100">
                Expense added!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Description */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1.5">
                  Description *
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Dinner at Olive Bar"
                  required
                  autoFocus
                  className="input-dark"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1.5">
                  Amount (Rs) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    {'\u20B9'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="input-dark pl-8"
                  />
                </div>
              </div>

              {/* Date + Category row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input-dark"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-dark"
                  >
                    <option value="">None</option>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Paid by */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1.5">
                  Paid by
                </label>
                <select
                  value={paidById}
                  onChange={(e) => setPaidById(e.target.value)}
                  className="input-dark"
                >
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Split type */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1.5">
                  Split type
                </label>
                <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  {splitTypes.map((st) => (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => setSplitType(st.key)}
                      className={cn(
                        'flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all',
                        splitType === st.key
                          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                          : 'text-zinc-500 border border-transparent',
                      )}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Participants */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1.5">
                  Split between
                  {splitType === 'EXACT' && amount && (
                    <span className="ml-2 text-zinc-600">
                      (Remaining: Rs{' '}
                      {(() => {
                        const total = parseFloat(amount) || 0;
                        const filled = selectedMembers.reduce(
                          (sum, uid) =>
                            sum + (parseFloat(splitValues[uid] || '0') || 0),
                          0,
                        );
                        return (total - filled).toFixed(2);
                      })()}
                      )
                    </span>
                  )}
                </label>
                <div className="space-y-2">
                  {members.map((m, idx) => {
                    // For EXACT: compute remaining for auto-fill
                    const isSelected = selectedMembers.includes(m.userId);
                    let autoFillValue = '';
                    if (
                      splitType === 'EXACT' &&
                      isSelected &&
                      amount &&
                      !splitValues[m.userId]
                    ) {
                      const total = parseFloat(amount) || 0;
                      const filledMembers = selectedMembers.filter(
                        (uid) =>
                          uid !== m.userId &&
                          splitValues[uid] &&
                          parseFloat(splitValues[uid]) > 0,
                      );
                      // Auto-fill if this is the only unfilled member
                      if (filledMembers.length === selectedMembers.length - 1) {
                        const filledSum = filledMembers.reduce(
                          (sum, uid) =>
                            sum + (parseFloat(splitValues[uid] || '0') || 0),
                          0,
                        );
                        const remaining = total - filledSum;
                        if (remaining > 0) {
                          autoFillValue = remaining.toFixed(2);
                        }
                      }
                    }

                    return (
                    <div key={m.userId} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleMember(m.userId)}
                        className={cn(
                          'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all',
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                            : 'border-white/10 text-transparent',
                        )}
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <span className="text-sm text-zinc-300 flex-1">
                        {m.user.name}
                      </span>
                      {splitType !== 'EQUAL' &&
                        isSelected && (
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={splitValues[m.userId] || autoFillValue}
                            onChange={(e) =>
                              setSplitValues((prev) => ({
                                ...prev,
                                [m.userId]: e.target.value,
                              }))
                            }
                            placeholder={
                              splitType === 'EXACT'
                                ? autoFillValue
                                  ? `Rs ${autoFillValue}`
                                  : 'Rs'
                                : splitType === 'PERCENTAGE'
                                  ? '%'
                                  : 'shares'
                            }
                            className="input-dark w-24 text-right text-xs"
                          />
                        )}
                    </div>
                    );
                  })}
                </div>

                {/* Pre-submit validation for EXACT and PERCENTAGE */}
                {splitType === 'EXACT' && amount && (() => {
                  const total = parseFloat(amount) || 0;
                  const filled = selectedMembers.reduce(
                    (sum, uid) => sum + (parseFloat(splitValues[uid] || '0') || 0),
                    0,
                  );
                  const diff = total - filled;
                  if (filled > 0 && Math.abs(diff) > 0.01 && diff !== total) {
                    return (
                      <p className={`text-xs mt-1 ${diff < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                        {diff > 0
                          ? `Rs ${diff.toFixed(2)} remaining — assign to a member`
                          : `Rs ${Math.abs(diff).toFixed(2)} over the total amount`}
                      </p>
                    );
                  }
                  return null;
                })()}
                {splitType === 'PERCENTAGE' && (() => {
                  const total = selectedMembers.reduce(
                    (sum, uid) => sum + (parseFloat(splitValues[uid] || '0') || 0),
                    0,
                  );
                  if (total > 0 && Math.abs(total - 100) > 0.01) {
                    return (
                      <p className="text-xs mt-1 text-rose-400">
                        Percentages total {total.toFixed(1)}% — must equal 100%
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {mutation.isError && (
                <p className="text-sm text-rose-400">
                  {(mutation.error as any)?.message || 'Failed to add expense'}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  mutation.isPending ||
                  !description.trim() ||
                  !amount ||
                  selectedMembers.length === 0
                }
                className="w-full py-3 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Add Expense'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
