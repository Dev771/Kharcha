'use client';

import { formatCurrency } from '@kharcha/shared';
import {
  Utensils,
  Car,
  Home,
  Gamepad2,
  ShoppingBag,
  Zap,
  Receipt,
} from 'lucide-react';

const categoryIcons: Record<string, { icon: any; color: string }> = {
  food: { icon: Utensils, color: 'text-orange-400 bg-orange-400/10' },
  transport: { icon: Car, color: 'text-blue-400 bg-blue-400/10' },
  accommodation: { icon: Home, color: 'text-violet-400 bg-violet-400/10' },
  entertainment: { icon: Gamepad2, color: 'text-pink-400 bg-pink-400/10' },
  shopping: { icon: ShoppingBag, color: 'text-amber-400 bg-amber-400/10' },
  groceries: { icon: ShoppingBag, color: 'text-emerald-400 bg-emerald-400/10' },
  utilities: { icon: Zap, color: 'text-cyan-400 bg-cyan-400/10' },
  rent: { icon: Home, color: 'text-violet-400 bg-violet-400/10' },
};

interface Props {
  expense: any;
  onClick?: () => void;
  index?: number;
}

export function ExpenseCard({ expense, onClick, index = 0 }: Props) {
  const cat = categoryIcons[expense.category] || {
    icon: Receipt,
    color: 'text-zinc-400 bg-zinc-400/10',
  };
  const Icon = cat.icon;
  const [iconText, iconBg] = cat.color.split(' ');

  return (
    <button
      onClick={onClick}
      className="w-full glass p-4 flex items-center gap-4 text-left group hover:-translate-y-0.5 transition-all anim-fade-up"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Category icon */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} group-hover:scale-110 transition-transform`}
      >
        <Icon className={`w-4 h-4 ${iconText}`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">
          {expense.description}
        </p>
        <p className="text-xs text-zinc-500">
          Paid by {expense.paidBy?.name || 'Unknown'} &middot;{' '}
          {new Date(expense.date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
          })}
        </p>
      </div>

      {/* Split badge */}
      <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-zinc-500 border border-white/[0.06] flex-shrink-0 hidden sm:block">
        {expense.splitType}
      </span>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-zinc-200">
          {formatCurrency(expense.amountInPaise)}
        </p>
      </div>
    </button>
  );
}
