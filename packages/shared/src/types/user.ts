export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  defaultCurrency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface UpdateUserRequest {
  name?: string;
  avatarUrl?: string;
  defaultCurrency?: string;
}

export interface UserSummary {
  totalOwedInPaise: number;
  totalOwingInPaise: number;
  groups: {
    groupId: string;
    groupName: string;
    netBalanceInPaise: number; // positive = owed to you, negative = you owe
  }[];
}
