'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateGroup } from '@/hooks/use-groups';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const mutation = useCreateGroup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const result = (await mutation.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
    })) as any;

    router.push(`/groups/${result.id}`);
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <Link
        href="/groups"
        className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mb-6"
      >
        <ArrowLeft className="w-3 h-3" /> Back to groups
      </Link>

      <h1 className="text-xl font-semibold text-zinc-100 mb-6">
        Create a new group
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-zinc-500 block mb-1.5">
            Group name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Goa Trip 2026"
            required
            autoFocus
            className="input-dark"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1.5">
            Description (optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Annual beach trip with friends"
            className="input-dark"
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-rose-400">
            {(mutation.error as any)?.message || 'Failed to create group'}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending || !name.trim()}
          className="w-full py-3 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Create Group'
          )}
        </button>
      </form>
    </div>
  );
}
