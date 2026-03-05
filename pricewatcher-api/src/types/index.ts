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

// ── 订单管理模块类型 ──────────────────────────────────────────

export type OrderStatus   = 'pending' | 'booked' | 'completed' | 'cancelled';
export type OrderSource   = 'xianyu' | 'manual';
export type OrderType     =
  | 'self_run' | 'wife_run' | 'guest_booking' | 'peer_referral'
  | 'milestone_rebate' | 'cancelled' | 'self_stay' | 'buy_points'
  | 'points_cash' | 'group_swipe' | 'voucher_cash';
export type PreAuthStatus = 'pending' | 'partial' | 'refunded';

export interface Order {
  id: string;
  createdAt: string;
  updatedAt: string;

  // 基本信息
  status: OrderStatus;
  source: OrderSource;
  orderType: OrderType;
  note?: string;

  // 客户信息
  customerName: string;
  customerContact: string;
  customerNeeds?: string;

  // 酒店信息
  city: string;
  hotelGroup: string;
  hotelName: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;           // 自动计算
  bookingMethod?: string;

  // 财务信息
  costPrice: number;
  salePrice: number;
  cashProfit: number;       // 自动计算 = salePrice - costPrice
  preAuth?: number;
  preAuthRefund?: number;
  preAuthStatus?: PreAuthStatus | null;  // 自动判断
  pointsEarned?: number;
  pointsValue?: number;
  totalRevenue: number;     // 自动计算 = cashProfit + (pointsValue ?? 0)
}

export interface OrderState {
  version: number;
  orders: Order[];
}

export interface OrderFilter {
  q?: string;
  status?: OrderStatus;
  orderType?: OrderType;
  city?: string;
  hotelGroup?: string;
  checkInFrom?: string;
  checkInTo?: string;
  preAuthPending?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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
