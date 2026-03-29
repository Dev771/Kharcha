'use client';

import { useState } from 'react';
import { formatCurrency, toPaise, toDisplay } from '@kharcha/shared';
import { X, Check, Loader2 } from 'lucide-react';
import { useCreateSettlement } from '@/hooks/use-settlements';

interface Member {
  userId: string;
  user: { id: string; name: string };
}

interface Props {
  groupId: string;
  members: Member[];
  prefill?: { fromId: string; toId: string; amountInPaise: number };
  onClose: () => void;
}

export function SettleForm({ groupId, members, prefill, onClose }: Props) {
  const [fromId, setFromId] = useState(prefill?.fromId || '');
  const [toId, setToId] = useState(prefill?.toId || '');
  const [amount, setAmount] = useState(
    prefill ? toDisplay(prefill.amountInPaise).toString() : '',
  );
  const [note, setNote] = useState('');
  const [success, setSuccess] = useState(false);

  const mutation = useCreateSettlement(groupId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId || !amount) return;

    await mutation.mutateAsync({
      paidById: fromId,
      paidToId: toId,
      amountInPaise: toPaise(parseFloat(amount)),
      note: note || undefined,
    });

    setSuccess(true);
    setTimeout(onClose, 1500);
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
              Record Payment
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
                Settlement recorded!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 block mb-1.5">
                  From (who is paying)
                </label>
                <select
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                  className="input-dark"
                  required
                >
                  <option value="">Select member</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1.5">
                  To (who is receiving)
                </label>
                <select
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="input-dark"
                  required
                >
                  <option value="">Select member</option>
                  {members
                    .filter((m) => m.userId !== fromId)
                    .map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1.5">
                  Amount
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
                    className="input-dark pl-8"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1.5">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., Settling up for the trip"
                  className="input-dark"
                />
              </div>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full py-3 btn-primary flex items-center justify-center gap-2"
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Record Payment'
                )}
              </button>

              {mutation.isError && (
                <p className="text-sm text-rose-400 text-center">
                  {(mutation.error as any)?.message || 'Failed to record payment'}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
