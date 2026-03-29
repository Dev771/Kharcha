'use client';

import { formatCurrency } from '@kharcha/shared';
import { X, User } from 'lucide-react';

interface Props {
  expense: any;
  onClose: () => void;
}

export function ExpenseDetail({ expense, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 overflow-y-auto anim-slide-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                {expense.description}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                {new Date(expense.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Amount */}
          <div className="glass p-4 mb-6">
            <p className="text-xs text-zinc-500 mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-zinc-100">
              {formatCurrency(expense.amountInPaise, expense.currency)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-zinc-500 border border-white/[0.06]">
                {expense.splitType}
              </span>
              {expense.category && (
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-[10px] text-cyan-400 border border-cyan-500/20">
                  {expense.category}
                </span>
              )}
            </div>
          </div>

          {/* Paid by */}
          <div className="mb-6">
            <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">
              Paid by
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-500/30 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <span className="text-sm font-medium text-zinc-200">
                {expense.paidBy?.name || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Split breakdown */}
          <div>
            <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">
              Split Breakdown
            </p>
            <div className="space-y-2">
              {expense.splits?.map((split: any) => (
                <div
                  key={split.id}
                  className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/[0.05] flex items-center justify-center">
                      <User className="w-3 h-3 text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-200">
                        {split.user?.name || 'Unknown'}
                      </p>
                      {split.shareValue !== null && (
                        <p className="text-[10px] text-zinc-600">
                          {expense.splitType === 'PERCENTAGE'
                            ? `${split.shareValue}%`
                            : expense.splitType === 'SHARES'
                              ? `${split.shareValue} share(s)`
                              : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-zinc-300">
                    {formatCurrency(split.owedAmountInPaise)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          {expense.tags?.length > 0 && (
            <div className="mt-6">
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">
                Tags
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {expense.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-zinc-400 border border-white/[0.06]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
