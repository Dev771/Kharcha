'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Users, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Status = 'loading' | 'joining' | 'success' | 'error' | 'already';

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const inviteCode = params.inviteCode as string;
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const [status, setStatus] = useState<Status>('loading');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token || !inviteCode) return;

    const join = async () => {
      setStatus('joining');
      try {
        const result = await apiClient<any>(`/groups/join/${inviteCode}`, {
          method: 'POST',
          token,
        });
        setGroupId(result.id || result.groupId);
        setStatus('success');
        toast.success('Joined group!');
      } catch (err: any) {
        const msg = err?.message || 'Failed to join group';
        if (msg.toLowerCase().includes('already')) {
          setStatus('already');
          // Try to find the group from the error or just go to groups list
          setErrorMsg('You are already a member of this group.');
        } else {
          setStatus('error');
          setErrorMsg(msg);
        }
      }
    };

    join();
  }, [token, inviteCode]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-sm">
        {(status === 'loading' || status === 'joining') && (
          <div className="animate-fade-in">
            <Loader2 className="w-10 h-10 text-brand animate-spin mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-[var(--foreground)]">Joining group...</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Please wait while we add you to the group.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-credit-bg flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-credit" />
            </div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">You're in!</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">You've successfully joined the group.</p>
            <Button variant="primary" size="lg" className="mt-6" onClick={() => router.push(groupId ? `/groups/${groupId}` : '/groups')}>
              <Users className="w-4 h-4" /> Go to Group
            </Button>
          </div>
        )}

        {status === 'already' && (
          <div className="animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-brand" />
            </div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">Already a member</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{errorMsg}</p>
            <Button variant="primary" size="lg" className="mt-6" onClick={() => router.push('/groups')}>
              Go to Groups
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-debit-bg flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-debit" />
            </div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">Couldn't join group</h1>
            <p className="text-sm text-debit mt-1">{errorMsg}</p>
            <Button variant="secondary" size="lg" className="mt-6" onClick={() => router.push('/groups')}>
              Go to Groups
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
