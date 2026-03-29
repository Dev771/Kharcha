'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Check, Copy, Loader2 } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { apiClient } from '@/lib/api-client';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Props {
  groupId: string;
  inviteCode: string;
  onClose: () => void;
}

export function AddMemberDialog({ groupId, inviteCode, onClose }: Props) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiClient<any[]>(`/groups/${groupId}/members/search?q=${encodeURIComponent(query)}`, { token });
        setResults(data);
      } catch { setResults([]); }
      setSearching(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, groupId, token]);

  const handleAdd = async (email: string, userId: string) => {
    setAdding(userId);
    try {
      await apiClient(`/groups/${groupId}/members`, { method: 'POST', body: { email }, token });
      setAddedIds((prev) => new Set(prev).add(userId));
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast.success('Member added!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add member');
    }
    setAdding(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/groups/join/${inviteCode}`);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <BottomSheet open onClose={onClose} title="Add Members">
      <div className="space-y-4">
        {/* Invite link */}
        <div className="p-3 rounded-xl bg-info-bg border border-info/20 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-info">Invite Link</p>
            <p className="text-[11px] text-info/70 truncate">{`${typeof window !== 'undefined' ? window.location.origin : ''}/groups/join/${inviteCode}`}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 text-credit" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email..." className="input-field pl-10" />
        </div>

        {/* Results */}
        {searching && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-brand animate-spin" /></div>}
        {results.length > 0 && (
          <div className="card-surface divide-y divide-[var(--border-light)]">
            {results.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <MemberAvatar name={u.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">{u.name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{u.email}</p>
                </div>
                {addedIds.has(u.id) ? (
                  <Check className="w-4 h-4 text-credit" />
                ) : (
                  <Button variant="primary" size="sm" onClick={() => handleAdd(u.email, u.id)} loading={adding === u.id}>Add</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
