'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useMessages, useSendMessage } from '@/hooks/use-messages';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { Amount } from '@/components/ui/amount';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Send, MessageCircle, Loader2, Check, CheckCheck, Receipt, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString('en-IN', { weekday: 'long' });
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN');
}

export function GroupChat({ groupId }: { groupId: string }) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: msgPages, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useMessages(groupId);
  const sendMutation = useSendMessage(groupId);

  const allMessages = (msgPages?.pages ?? []).flatMap((p: any) => p.messages ?? []).reverse();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendMutation.mutate(text);
  };

  // Group messages by date for date separators
  let lastDateKey = '';

  return (
    <div className="flex flex-col h-[60vh]">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {hasNextPage && (
          <div className="flex justify-center mb-4">
            <Button variant="ghost" size="sm" onClick={() => fetchNextPage()} loading={isFetchingNextPage}>Load older messages</Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-brand animate-spin" /></div>
        ) : allMessages.length === 0 ? (
          <EmptyState icon={MessageCircle} title="No messages yet" description="Start the conversation" compact />
        ) : (
          allMessages.map((msg: any, idx: number) => {
            const isOwn = msg.sender?.id === currentUserId;
            const isSystem = msg.type === 'SYSTEM' || msg.type === 'EXPENSE_LINK' || msg.type === 'SETTLEMENT_LINK';
            const isOptimistic = msg._optimistic;
            const dateKey = getDateKey(msg.createdAt);
            const showDateSep = dateKey !== lastDateKey;
            lastDateKey = dateKey;

            // Check if same sender as previous for grouping
            const prevMsg = idx > 0 ? allMessages[idx - 1] : null;
            const sameSenderAsPrev = prevMsg && prevMsg.sender?.id === msg.sender?.id && !isSystem && prevMsg.type !== 'SYSTEM' && prevMsg.type !== 'EXPENSE_LINK' && prevMsg.type !== 'SETTLEMENT_LINK';
            const showAvatar = !isOwn && !isSystem && !sameSenderAsPrev;
            const showName = !isOwn && !isSystem && !sameSenderAsPrev;

            return (
              <div key={msg.id}>
                {/* Date separator */}
                {showDateSep && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-[var(--border-light)]" />
                    <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">{formatDateLabel(msg.createdAt)}</span>
                    <div className="flex-1 h-px bg-[var(--border-light)]" />
                  </div>
                )}

                {/* System messages — expense/settlement cards */}
                {isSystem ? (
                  <div className="flex justify-center my-2">
                    <div className={cn(
                      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium',
                      msg.type === 'EXPENSE_LINK' ? 'bg-brand-light text-brand' :
                      msg.type === 'SETTLEMENT_LINK' ? 'bg-credit-bg text-credit-dark' :
                      'bg-[var(--subtle)] text-[var(--muted-foreground)]',
                    )}>
                      {msg.type === 'EXPENSE_LINK' && <Receipt className="w-3 h-3" />}
                      {msg.type === 'SETTLEMENT_LINK' && <Banknote className="w-3 h-3" />}
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  /* Regular messages */
                  <div className={cn('flex gap-2', isOwn ? 'justify-end' : 'justify-start', sameSenderAsPrev ? 'mt-0.5' : 'mt-3')}>
                    {/* Avatar space — show avatar or placeholder for alignment */}
                    {!isOwn && (
                      <div className="w-6 shrink-0">
                        {showAvatar && <MemberAvatar name={msg.sender?.name || 'User'} avatarUrl={msg.sender?.avatarUrl} size="xs" />}
                      </div>
                    )}

                    <div className={cn('max-w-[75%]', isOwn && 'flex flex-col items-end')}>
                      {showName && (
                        <p className="text-[10px] text-[var(--text-muted)] mb-0.5 ml-1 font-medium">{msg.sender?.name}</p>
                      )}
                      <div className={cn(
                        'px-3 py-2 text-sm leading-relaxed',
                        isOwn
                          ? cn('bg-brand text-white', sameSenderAsPrev ? 'rounded-2xl rounded-tr-lg' : 'rounded-2xl rounded-br-lg')
                          : cn('bg-[var(--card)] border border-[var(--border-light)]', sameSenderAsPrev ? 'rounded-2xl rounded-tl-lg' : 'rounded-2xl rounded-bl-lg'),
                        isOptimistic && 'opacity-70',
                      )}>
                        {msg.content}
                      </div>
                      <div className={cn('flex items-center gap-1 mt-0.5', isOwn ? 'mr-1' : 'ml-1')}>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {isOptimistic ? 'Sending...' : new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {/* Delivery ticks for own messages */}
                        {isOwn && !isOptimistic && (
                          <CheckCheck className="w-3 h-3 text-[var(--text-muted)]" />
                        )}
                        {isOwn && isOptimistic && (
                          <Check className="w-3 h-3 text-white/50" />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-[var(--border)] bg-[var(--card)] px-3 py-3 flex items-end gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type a message..."
          className="input-field flex-1 py-2.5"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sendMutation.isPending}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95',
            input.trim() ? 'bg-brand text-white shadow-brand' : 'bg-[var(--subtle)] text-[var(--text-muted)]',
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
