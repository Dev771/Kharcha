'use client';

import { useGroups } from '@/hooks/use-groups';
import { GroupCard } from '@/components/groups/group-card';
import { Loader2 } from 'lucide-react';

export default function GroupsPage() {
  const { data: groups, isLoading } = useGroups();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-zinc-100 mb-6">Your Groups</h1>
      <div className="space-y-2">
        {groups?.map((g: any, i: number) => (
          <GroupCard key={g.id} group={g} index={i} />
        ))}
      </div>
    </div>
  );
}
