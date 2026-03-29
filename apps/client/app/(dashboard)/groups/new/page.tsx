'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateGroup } from '@/hooks/use-groups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

type Step = 1 | 2 | 3;

export default function NewGroupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const mutation = useCreateGroup();
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const result = (await mutation.mutateAsync({ name: name.trim(), description: description.trim() || undefined })) as any;
      setCreatedGroupId(result.id);
      setStep(3);
      toast.success('Group created!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create group');
    }
  };

  return (
    <div className="p-5 md:p-6 max-w-lg mx-auto">
      <Link href="/groups" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1 mb-6 min-h-[44px]">
        <ArrowLeft className="w-3 h-3" /> Back to groups
      </Link>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
              step >= s ? 'bg-brand text-white' : 'bg-[var(--subtle)] text-[var(--text-muted)]')}>
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && <div className={cn('flex-1 h-0.5 rounded-full', step > s ? 'bg-brand' : 'bg-[var(--border)]')} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="animate-fade-in space-y-4">
          <div>
            <h1 className="text-xl font-semibold text-[var(--foreground)] mb-1">Create a new group</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Give it a name so everyone knows what it's for.</p>
          </div>
          <Input label="Group name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Goa Trip 2026" autoFocus />
          <Input label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Annual beach trip" />
          <Button variant="primary" size="lg" className="w-full" disabled={!name.trim()} onClick={() => setStep(2)}>
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="animate-fade-in space-y-4">
          <div>
            <h1 className="text-xl font-semibold text-[var(--foreground)] mb-1">Review & Create</h1>
            <p className="text-sm text-[var(--muted-foreground)]">You can add members after creating the group.</p>
          </div>
          <div className="card-surface p-4 space-y-2">
            <div><p className="text-xs text-[var(--text-muted)]">Name</p><p className="text-sm font-medium text-[var(--foreground)]">{name}</p></div>
            {description && <div><p className="text-xs text-[var(--text-muted)]">Description</p><p className="text-sm text-[var(--foreground)]">{description}</p></div>}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep(1)}>Back</Button>
            <Button variant="primary" size="lg" className="flex-1" loading={mutation.isPending} onClick={handleCreate}>Create Group</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-scale-in text-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-credit-bg flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-credit" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Group Created!</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Now add members and start splitting expenses.</p>
          <Button variant="primary" size="lg" onClick={() => router.push(`/groups/${createdGroupId}`)}>
            <Users className="w-4 h-4" /> Go to Group
          </Button>
        </div>
      )}
    </div>
  );
}
