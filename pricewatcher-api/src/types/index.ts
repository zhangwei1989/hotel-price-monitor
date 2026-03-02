// TypeScript 类型定义

export interface User {
  username: string;
  role: 'admin';
}

export interface AuthConfig {
  version: number;
  admin: {
    username: string;
    passwordHash: string;
    createdAt: string;
    lastLogin: string | null;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  security: {
    maxLoginAttempts: number;
    lockoutDuration: number;
    sessionTimeout: number;
  };
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface MonitorTask {
  id: string;
  type: string;
  provider: string;
  hotelName: string;
  hotelId: string;
  city: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomName: string;
  ratePlanHint: string;
  currency: string;
  threshold: {
    type: string;
    value: number;
  };
  frequencyMinutes: number;
  autoStopDate: string;
  link: string;
  createdAt: string;
  lastCheckedAt: string;
  lastPrice: number | null;
  lastStatus: string;
  enabled?: boolean; // true=监控中；false=暂停
  pausedAt?: string | null;
  currentPriceOptions: Array<{
    price: number;
    description: string;
  }>;
  history: Array<{
    ts: string;
    price: number | null;
    status: string;
    note: string;
  }>;
}

export interface MonitorState {
  version: number;
  metadata?: {
    totalTasks: number;
    activeTasks: number;
    lastSchedulerRun: string | null;
    schedulerEnabled: boolean;
  };
  monitors: MonitorTask[];
}

export interface TaskFilter {
  city?: string;
  status?: string;
  hotelName?: string;
  checkInFrom?: string;
  checkInTo?: string;
  currentPriceMin?: number;
  currentPriceMax?: number;
  belowTarget?: boolean;
  enabled?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
