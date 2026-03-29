'use client';

import { useSession } from 'next-auth/react';

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold text-zinc-100 mb-6">Settings</h1>
      <div className="glass p-6 space-y-4">
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Name</label>
          <p className="text-sm text-zinc-200">{session?.user?.name || '—'}</p>
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Email</label>
          <p className="text-sm text-zinc-200">{session?.user?.email || '—'}</p>
        </div>
        <p className="text-xs text-zinc-600">
          Full profile editing coming in a later phase.
        </p>
      </div>
    </div>
  );
}
