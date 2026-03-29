'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Search, UserPlus, Loader2, Check } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';

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
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiClient<any[]>(
          `/groups/${groupId}/members/search?q=${encodeURIComponent(query)}`,
          { token },
        );
        setResults(data);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, groupId, token]);

  const handleAdd = async (email: string, userId: string) => {
    setAdding(userId);
    setError('');
    try {
      await apiClient(`/groups/${groupId}/members`, {
        method: 'POST',
        body: { email },
        token,
      });
      setAddedIds((prev) => new Set(prev).add(userId));
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    } catch (err: any) {
      setError(err?.message || 'Failed to add member');
    }
    setAdding(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/groups/join/${inviteCode}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              Add Members
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="input-dark pl-10"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-rose-400 mb-3">{error}</p>
          )}

          {/* Search results */}
          {searching ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2 mb-6">
              {results.map((user) => (
                <div
                  key={user.id}
                  className="glass p-3 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-zinc-400">
                      {user.name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {user.email}
                    </p>
                  </div>
                  {addedIds.has(user.id) ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <button
                      onClick={() => handleAdd(user.email, user.id)}
                      disabled={adding === user.id}
                      className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all"
                    >
                      {adding === user.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <p className="text-xs text-zinc-500 text-center py-4 mb-6">
              No users found. They need to sign up first.
            </p>
          ) : null}

          {/* Invite link */}
          <div className="border-t border-white/[0.06] pt-4">
            <p className="text-xs text-zinc-500 mb-2">
              Or share the invite link
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteCode}
                className="input-dark flex-1 text-xs font-mono"
              />
              <button
                onClick={handleCopy}
                className="btn-ghost px-3 py-2 text-xs"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
