'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { Badge } from '@/components/ui/badge';
import { useUpdateGroup, useArchiveGroup, useRegenerateInvite, useRemoveMember } from '@/hooks/use-groups';
import { Copy, Check, RefreshCw, Link as LinkIcon, Archive, Crown, UserMinus, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface Props {
  open: boolean;
  onClose: () => void;
  group: any;
}

export function GroupSettingsSheet({ open, onClose, group }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [imageUrl, setImageUrl] = useState(group.imageUrl || '');
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const updateMutation = useUpdateGroup(group.id);
  const archiveMutation = useArchiveGroup(group.id);
  const regenerateMutation = useRegenerateInvite(group.id);
  const removeMemberMutation = useRemoveMember(group.id);

  const members = group.members || [];
  const isAdmin = members.find((m: any) => m.userId === currentUserId)?.role === 'ADMIN';
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/groups/join/${group.inviteCode}` : '';

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await updateMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
      });
      setEditing(false);
      toast.success('Group updated!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update group');
    }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateInvite = async () => {
    try {
      await regenerateMutation.mutateAsync();
      toast.success('Invite link regenerated!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to regenerate link');
    }
  };

  const handleArchive = async () => {
    try {
      await archiveMutation.mutateAsync();
      toast.success('Group archived');
      onClose();
      router.push('/groups');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to archive group');
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    try {
      await removeMemberMutation.mutateAsync(userId);
      toast.success(`${userName} removed from group`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove member');
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setName(group.name);
    setDescription(group.description || '');
    setImageUrl(group.imageUrl || '');
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Group Settings">
      <div className="space-y-6">
        {/* Group Info + Image */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Group Info</h3>
            {isAdmin && !editing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              {/* Image preview + URL input */}
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">Group Image</label>
                {imageUrl && (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden mb-2 bg-[var(--subtle)]">
                    <img
                      src={imageUrl}
                      alt="Group"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <button
                      onClick={() => setImageUrl('')}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Paste image URL (e.g., from Imgur)"
                  leftAddon={<ImagePlus className="w-3.5 h-3.5" />}
                />
              </div>

              <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={cancelEdit}>Cancel</Button>
                <Button variant="primary" size="sm" className="flex-1" onClick={handleSave} loading={updateMutation.isPending} disabled={!name.trim()}>Save</Button>
              </div>
            </div>
          ) : (
            <div className="card-surface overflow-hidden">
              {/* Show image if exists */}
              {group.imageUrl && (
                <div className="w-full h-32 bg-[var(--subtle)]">
                  <img src={group.imageUrl} alt={group.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4 space-y-1">
                <p className="text-sm font-medium text-[var(--foreground)]">{group.name}</p>
                {group.description && <p className="text-xs text-[var(--muted-foreground)]">{group.description}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Invite link */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Invite Link</h3>
          <div className="card-surface p-3 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
            <p className="text-xs text-[var(--muted-foreground)] truncate flex-1">{inviteUrl}</p>
            <Button variant="ghost" size="sm" onClick={handleCopyInvite}>
              {copied ? <Check className="w-4 h-4 text-credit" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={handleRegenerateInvite} loading={regenerateMutation.isPending}>
              <RefreshCw className="w-3 h-3" /> Regenerate
            </Button>
          )}
        </div>

        {/* Members */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Members ({members.length})</h3>
          <div className="card-surface divide-y divide-[var(--border-light)] overflow-hidden">
            {members.map((m: any) => {
              const isCurrentUser = m.userId === currentUserId;
              const memberIsAdmin = m.role === 'ADMIN';
              return (
                <div key={m.userId} className="flex items-center gap-3 px-4 py-3">
                  <MemberAvatar name={m.user?.name || 'Unknown'} avatarUrl={m.user?.avatarUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {m.user?.name}{isCurrentUser ? ' (you)' : ''}
                      </p>
                      {memberIsAdmin && (
                        <Badge variant="brand" size="sm"><Crown className="w-2.5 h-2.5" /> Admin</Badge>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] truncate">{m.user?.email}</p>
                  </div>
                  {isAdmin && !isCurrentUser && (
                    <Button variant="ghost" size="sm"
                      onClick={() => handleRemoveMember(m.userId, m.user?.name || 'Member')}
                      loading={removeMemberMutation.isPending}>
                      <UserMinus className="w-3.5 h-3.5 text-debit" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Danger zone */}
        {isAdmin && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-debit">Danger Zone</h3>
            <div className="card-surface border-debit/20 overflow-hidden">
              {!confirmArchive ? (
                <button onClick={() => setConfirmArchive(true)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[52px] text-left hover:bg-debit-bg transition-colors">
                  <Archive className="w-4 h-4 text-debit shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-debit">Archive Group</p>
                    <p className="text-xs text-[var(--text-muted)]">Group will be hidden from active list.</p>
                  </div>
                </button>
              ) : (
                <div className="p-4 bg-debit-bg space-y-3">
                  <p className="text-sm text-debit font-medium">Are you sure you want to archive &quot;{group.name}&quot;?</p>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirmArchive(false)}>Cancel</Button>
                    <Button variant="danger" size="sm" className="flex-1" onClick={handleArchive} loading={archiveMutation.isPending}>
                      <Archive className="w-3.5 h-3.5" /> Archive
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
