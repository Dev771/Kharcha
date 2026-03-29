'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Amount } from '@/components/ui/amount';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUpdateExpense, useDeleteExpense } from '@/hooks/use-expenses';
import { useSettleSplit } from '@/hooks/use-settlements';
import { EXPENSE_CATEGORIES, toPaise, toDisplay, formatCurrency } from '@kharcha/shared';
import { Pencil, Trash2, Search, X, HandCoins, Calendar, Tag, Check, Receipt, SplitSquareVertical } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  expense: any | null;
  members?: any[];
  simplifiedSettlements?: any[];
  onSettle?: (fromId: string, toId: string, amountInPaise: number) => void;
  onClose: () => void;
}

function CategoryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () => EXPENSE_CATEGORIES.filter((c) => c.toLowerCase().includes(search.toLowerCase())),
    [search],
  );

  return (
    <div className="relative">
      <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">Category</label>
      <button type="button" onClick={() => setOpen(!open)} className="input-field text-left flex items-center justify-between">
        <span className={value ? 'text-[var(--foreground)] capitalize' : 'text-[var(--text-muted)]'}>{value || 'Select category'}</span>
        {value ? (
          <X className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false); }} />
        ) : (
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
        )}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-card z-10 overflow-hidden animate-fade-in">
          <div className="p-2 border-b border-[var(--border-light)]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories..." autoFocus
                className="w-full pl-8 pr-3 py-2 text-xs bg-[var(--subtle)] border border-[var(--border-light)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--primary)]" />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">No categories found</p>
            ) : filtered.map((c) => (
              <button key={c} type="button" onClick={() => { onChange(c); setOpen(false); setSearch(''); }}
                className={cn('w-full text-left px-4 py-2.5 text-sm capitalize transition-colors min-h-[40px]',
                  c === value ? 'bg-brand-light text-brand font-medium' : 'text-[var(--foreground)] hover:bg-[var(--hover)]')}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ExpenseDetailSheet({ expense, members = [], simplifiedSettlements = [], onSettle, onClose }: Props) {
  const params = useParams();
  const groupId = params.groupId as string;
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [paidById, setPaidById] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateMutation = useUpdateExpense(groupId);
  const deleteMutation = useDeleteExpense(groupId);
  const settleSplitMutation = useSettleSplit(groupId);

  const startEdit = () => {
    if (!expense) return;
    setDescription(expense.description);
    setAmount(toDisplay(expense.amountInPaise).toString());
    setCategory(expense.category || '');
    setPaidById(expense.paidBy?.id || expense.paidById || '');
    setDate(expense.date ? new Date(expense.date).toISOString().slice(0, 10) : '');
    setEditing(true);
    setConfirmDelete(false);
  };

  const handleSave = async () => {
    if (!expense || !description.trim() || !amount) return;
    try {
      const data: any = {
        description: description.trim(),
        category: category || undefined,
        date: date || undefined,
        paidById: paidById || undefined,
      };
      const newAmount = toPaise(parseFloat(amount));
      if (newAmount !== expense.amountInPaise) {
        data.amountInPaise = newAmount;
        if (expense.splits?.length) {
          data.splitType = expense.splitType;
          data.splits = expense.splits.map((s: any) => ({
            userId: s.user?.id || s.userId,
            value: s.shareValue ?? undefined,
          }));
        }
      }
      await updateMutation.mutateAsync({ expenseId: expense.id, data });
      setEditing(false);
      toast.success('Expense updated!');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update expense');
    }
  };

  const handleDelete = async () => {
    if (!expense) return;
    try {
      await deleteMutation.mutateAsync(expense.id);
      toast.success('Expense deleted');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete expense');
    }
  };

  if (!expense) return null;

  const payerName = expense.paidBy?.name || 'Unknown';
  const payerId = expense.paidBy?.id || expense.paidById;
  const splitCount = expense.splits?.length || 0;
  const perPerson = splitCount > 0 ? Math.round(expense.amountInPaise / splitCount) : 0;

  // Check simplified balances: do I actually owe the payer anything in this group right now?
  const mySettlement = simplifiedSettlements.find(
    (s: any) => s.from?.id === currentUserId && s.to?.id === payerId,
  );
  const actualOwed = mySettlement?.amountInPaise ?? 0;

  return (
    <BottomSheet open={!!expense} onClose={() => { setEditing(false); setConfirmDelete(false); onClose(); }} title={editing ? 'Edit Expense' : 'Expense Details'}>
      <div className="space-y-5">
        {editing ? (
          /* ─── Edit Mode ─── */
          <div className="space-y-4">
            <Input label="Amount (₹)" type="number" inputMode="decimal" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} leftAddon="₹" />
            <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <CategoryPicker value={category} onChange={setCategory} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">Paid by</label>
                <select value={paidById} onChange={(e) => setPaidById(e.target.value)} className="select-field">
                  {members.map((m: any) => <option key={m.userId} value={m.userId}>{m.user?.name || 'Unknown'}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" size="md" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
              <Button variant="primary" size="md" className="flex-1" onClick={handleSave} loading={updateMutation.isPending} disabled={!description.trim() || !amount}>Save</Button>
            </div>
          </div>
        ) : (
          /* ─── View Mode ─── */
          <>
            {/* Hero amount */}
            <div className="text-center pt-2">
              <Amount paise={expense.amountInPaise} size="hero" />
              <p className="text-md font-semibold text-[var(--foreground)] mt-2">{expense.description}</p>
            </div>

            {/* Info grid */}
            <div className="card-surface divide-y divide-[var(--border-light)] overflow-hidden">
              {/* Paid by */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">Paid by</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <MemberAvatar name={payerName} size="xs" />
                    <p className="text-sm font-medium text-[var(--foreground)]">{payerName}</p>
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-info-bg flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-info" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">Date</p>
                  <p className="text-sm text-[var(--foreground)]">
                    {new Date(expense.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Category */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-warning-bg flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">Category</p>
                  <p className="text-sm text-[var(--foreground)] capitalize">{expense.category || 'Uncategorized'}</p>
                </div>
              </div>

              {/* Split type */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--subtle)] flex items-center justify-center shrink-0">
                  <SplitSquareVertical className="w-4 h-4 text-[var(--muted-foreground)]" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">Split Type</p>
                  <p className="text-sm text-[var(--foreground)]">{expense.splitType} · {splitCount} people · ~{formatCurrency(perPerson)} each</p>
                </div>
              </div>
            </div>

            {/* Split breakdown with settlement status */}
            {expense.splits && expense.splits.length > 0 && (() => {
              // Non-payer splits
              const nonPayerSplits = expense.splits.filter((s: any) => (s.user?.id || s.userId) !== payerId);
              const unsettledNonPayer = nonPayerSplits.filter((s: any) => !s.isSettled);
              const settledNonPayer = nonPayerSplits.filter((s: any) => s.isSettled);
              const allSettled = unsettledNonPayer.length === 0 && nonPayerSplits.length > 0;

              return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Who Owes What</p>
                    {allSettled ? (
                      <Badge variant="credit" size="sm"><Check className="w-2.5 h-2.5" /> All Settled</Badge>
                    ) : settledNonPayer.length > 0 ? (
                      <Badge variant="credit" size="sm"><Check className="w-2.5 h-2.5" /> {settledNonPayer.length}/{nonPayerSplits.length}</Badge>
                    ) : null}
                  </div>
                  <div className="card-surface divide-y divide-[var(--border-light)] overflow-hidden">
                    {expense.splits.map((s: any) => {
                      const splitUserId = s.user?.id || s.userId;
                      const isMe = splitUserId === currentUserId;
                      const isPayer = splitUserId === payerId;
                      // Payer's split is always "settled" (they paid)
                      const isEffectivelySettled = isPayer || s.isSettled;
                      // Can settle: non-payer, not yet settled, and current user is the debtor or the payer
                      const canSettle = !isPayer && !s.isSettled && (isMe || currentUserId === payerId);

                      return (
                        <div key={s.id} className={cn('flex items-center gap-2 px-4 py-3', isEffectivelySettled && !isPayer && 'bg-credit-bg/50')}>
                          <MemberAvatar name={s.user?.name || 'Unknown'} size="xs" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-[var(--foreground)] truncate block">
                              {s.user?.name}{isMe ? ' (you)' : ''}
                            </span>
                            {isPayer && <span className="text-[10px] text-credit font-medium">Paid ✓</span>}
                            {s.isSettled && !isPayer && (
                              <span className="text-[10px] text-credit font-medium">
                                Settled ✓ {s.settledAt ? new Date(s.settledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                              </span>
                            )}
                            {!isPayer && !s.isSettled && <span className="text-[10px] text-debit font-medium">Unsettled</span>}
                          </div>
                          <Amount paise={s.owedAmountInPaise} size="sm" className={cn('shrink-0', isEffectivelySettled ? 'text-credit' : 'text-debit')} />
                          {canSettle && (
                            <Button variant="ghost" size="sm"
                              onClick={() => { settleSplitMutation.mutate(s.id); toast.success('Split settled!'); }}
                              loading={settleSplitMutation.isPending}>
                              <Check className="w-3.5 h-3.5 text-credit" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Settle all unsettled with payer */}
                  {unsettledNonPayer.length > 0 && currentUserId !== payerId && onSettle && (() => {
                    const myUnsettled = unsettledNonPayer.filter((s: any) => (s.user?.id || s.userId) === currentUserId);
                    const myTotal = myUnsettled.reduce((sum: number, s: any) => sum + s.owedAmountInPaise, 0);
                    if (myTotal <= 0) return null;
                    return (
                      <div className="mt-3">
                        <Button variant="primary" size="md" className="w-full"
                          onClick={() => { onSettle(currentUserId!, payerId, myTotal); onClose(); }}>
                          <HandCoins className="w-4 h-4" /> Settle All With {payerName}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="md" className="flex-1" onClick={startEdit}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
              {!confirmDelete ? (
                <Button variant="danger" size="md" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button variant="danger" size="md" onClick={handleDelete} loading={deleteMutation.isPending}>
                  Confirm Delete
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
