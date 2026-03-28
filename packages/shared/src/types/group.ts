export type GroupRole = 'ADMIN' | 'MEMBER';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  inviteCode: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  joinedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}

export interface GroupWithMembers extends Group {
  members: GroupMember[];
  memberCount: number;
}
