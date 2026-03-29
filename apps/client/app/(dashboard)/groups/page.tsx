'use client';

import { useState } from 'react';
import { useGroups } from '@/hooks/use-groups';
import { useUserSummary } from '@/hooks/use-balances';
import { GroupCard } from '@/components/groups/group-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Search, Users, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Filter = 'all' | 'active' | 'archived';

export default function GroupsPage() {
  const { data: groups, isLoading } = useGroups();
  const { data: summary } = useUserSummary();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const balanceMap = new Map(summary?.groups?.map((g) => [g.groupId, g.netBalanceInPaise]) ?? []);

  const filtered = (groups || []).filter((g: any) => {
    if (filter === 'active' && g.isArchived) return false;
    if (filter === 'archived' && !g.isArchived) return false;
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = (groups || []).filter((g: any) => !g.isArchived).length;
  const archivedCount = (groups || []).filter((g: any) => g.isArchived).length;

  if (isLoading) {
    return <div className="p-5 md:p-6 max-w-3xl mx-auto space-y-2">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>;
  }

  return (
    <div className="p-5 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Groups</h1>
        <Button variant="primary" size="sm" onClick={() => router.push('/groups/new')}><Plus className="w-4 h-4" /> New</Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search groups..." className="input-field pl-10" />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        <Chip label={`All (${(groups || []).length})`} selected={filter === 'all'} onClick={() => setFilter('all')} />
        <Chip label={`Active (${activeCount})`} selected={filter === 'active'} onClick={() => setFilter('active')} />
        <Chip label={`Archived (${archivedCount})`} selected={filter === 'archived'} onClick={() => setFilter('archived')} />
      </div>

      {/* List */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((g: any, i: number) => (
            <GroupCard key={g.id} group={g} netBalanceInPaise={balanceMap.get(g.id) ?? 0} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Users} title="No groups found" description={search ? 'Try a different search' : 'Create a group to get started'}
          action={!search ? { label: 'Create Group', onClick: () => router.push('/groups/new') } : undefined} />
      )}
    </div>
  );
}
