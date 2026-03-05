/**
 * OrderService — 代订订单管理
 * TASK-ORDER-API-01
 */
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  Order, OrderState, OrderFilter,
  OrderStatus, OrderType, PreAuthStatus,
} from '../types';

const ORDERS_PATH = path.join(__dirname, '../../../orders.json');

// ── 自动计算字段 ───────────────────────────────────────────────

function calcNights(checkIn: string, checkOut: string): number {
  return Math.max(0, Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
  ));
}

function calcPreAuthStatus(
  preAuth?: number,
  preAuthRefund?: number
): PreAuthStatus | null {
  if (!preAuth || preAuth <= 0) return null;
  if (!preAuthRefund || preAuthRefund <= 0) return 'pending';
  if (preAuthRefund < preAuth) return 'partial';
  return 'refunded';
}

function calcDerived(data: Partial<Order>): Partial<Order> {
  const costPrice  = data.costPrice  ?? 0;
  const salePrice  = data.salePrice  ?? 0;
  const cashProfit = salePrice - costPrice;
  const pointsValue = data.pointsValue ?? 0;
  const totalRevenue = cashProfit + pointsValue;

  const nights = (data.checkIn && data.checkOut)
    ? calcNights(data.checkIn, data.checkOut)
    : (data.nights ?? 0);

  const preAuthStatus = calcPreAuthStatus(data.preAuth, data.preAuthRefund);

  return { ...data, nights, cashProfit, totalRevenue, preAuthStatus };
}

// ── 文件读写 ───────────────────────────────────────────────────

async function readState(): Promise<OrderState> {
  try {
    const content = await fs.readFile(ORDERS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    // 文件不存在则初始化
    const init: OrderState = { version: 1, orders: [] };
    await writeState(init);
    return init;
  }
}

async function writeState(state: OrderState): Promise<void> {
  await fs.writeFile(ORDERS_PATH, JSON.stringify(state, null, 2));
}

// ── OrderService ──────────────────────────────────────────────

export class OrderService {

  // 列表（分页 + 筛选 + 排序）
  async listOrders(filter: OrderFilter = {}): Promise<{
    orders: Order[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const state = await readState();
    let orders = [...state.orders];

    // 搜索（客户名/酒店名）
    if (filter.q) {
      const q = filter.q.toLowerCase();
      orders = orders.filter(o =>
        o.customerName?.toLowerCase().includes(q) ||
        o.hotelName?.toLowerCase().includes(q)
      );
    }

    if (filter.status)    orders = orders.filter(o => o.status    === filter.status);
    if (filter.orderType) orders = orders.filter(o => o.orderType === filter.orderType);
    if (filter.city)      orders = orders.filter(o => o.city      === filter.city);
    if (filter.hotelGroup) orders = orders.filter(o => o.hotelGroup === filter.hotelGroup);

    if (filter.checkInFrom) orders = orders.filter(o => o.checkIn >= filter.checkInFrom!);
    if (filter.checkInTo)   orders = orders.filter(o => o.checkIn <= filter.checkInTo!);

    if (filter.preAuthPending) {
      orders = orders.filter(o =>
        o.preAuth && o.preAuth > 0 &&
        (o.preAuthStatus === 'pending' || o.preAuthStatus === 'partial')
      );
    }

    // 排序
    const sortBy    = filter.sortBy    || 'createdAt';
    const sortOrder = filter.sortOrder || 'desc';
    const dir = sortOrder === 'asc' ? 1 : -1;
    orders.sort((a, b) => {
      const av = (a as any)[sortBy] ?? '';
      const bv = (b as any)[sortBy] ?? '';
      if (av === bv) return 0;
      return av > bv ? dir : -dir;
    });

    const total    = orders.length;
    const pageSize = filter.pageSize ?? 20;
    const page     = filter.page     ?? 1;
    const start    = (page - 1) * pageSize;

    return { orders: orders.slice(start, start + pageSize), total, page, pageSize };
  }

  // 单条
  async getOrder(id: string): Promise<Order | null> {
    const state = await readState();
    return state.orders.find(o => o.id === id) ?? null;
  }

  // 创建
  async createOrder(data: Partial<Order>): Promise<Order> {
    const state  = await readState();
    const now    = new Date().toISOString();
    const derived = calcDerived(data);

    const order: Order = {
      id:              randomUUID(),
      createdAt:       now,
      updatedAt:       now,
      status:          (data.status      as OrderStatus)  || 'pending',
      source:          (data.source      as any)          || 'manual',
      orderType:       (data.orderType   as OrderType)    || 'self_run',
      note:            data.note,
      customerName:    data.customerName    || '',
      customerContact: data.customerContact || '',
      customerNeeds:   data.customerNeeds,
      city:            data.city        || '',
      hotelGroup:      data.hotelGroup  || '',
      hotelName:       data.hotelName   || '',
      roomType:        data.roomType    || '',
      checkIn:         data.checkIn     || '',
      checkOut:        data.checkOut    || '',
      nights:          derived.nights   as number,
      bookingMethod:   data.bookingMethod,
      costPrice:       data.costPrice   ?? 0,
      salePrice:       data.salePrice   ?? 0,
      cashProfit:      derived.cashProfit   as number,
      preAuth:         data.preAuth,
      preAuthRefund:   data.preAuthRefund,
      preAuthStatus:   derived.preAuthStatus as PreAuthStatus | null,
      pointsEarned:    data.pointsEarned,
      pointsValue:     data.pointsValue,
      totalRevenue:    derived.totalRevenue as number,
    };

    state.orders.push(order);
    await writeState(state);
    return order;
  }

  // 更新
  async updateOrder(id: string, data: Partial<Order>): Promise<Order | null> {
    const state = await readState();
    const idx   = state.orders.findIndex(o => o.id === id);
    if (idx === -1) return null;

    const merged  = { ...state.orders[idx], ...data, id, updatedAt: new Date().toISOString() };
    const derived = calcDerived(merged);
    const updated: Order = {
      ...merged,
      nights:        derived.nights        as number,
      cashProfit:    derived.cashProfit    as number,
      totalRevenue:  derived.totalRevenue  as number,
      preAuthStatus: derived.preAuthStatus as PreAuthStatus | null,
    };

    state.orders[idx] = updated;
    await writeState(state);
    return updated;
  }

  // 删除
  async deleteOrder(id: string): Promise<boolean> {
    const state = await readState();
    const idx   = state.orders.findIndex(o => o.id === id);
    if (idx === -1) return false;
    state.orders.splice(idx, 1);
    await writeState(state);
    return true;
  }

  // ── 统计分析 ───────────────────────────────────────────────

  async getSummary(): Promise<object> {
    const state  = await readState();
    const orders = state.orders;
    const now    = new Date();
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const thisMonth = orders.filter(o => o.createdAt >= thisMonthStart && o.status !== 'cancelled');
    const pending   = orders.filter(o =>
      o.preAuth && o.preAuth > 0 &&
      (o.preAuthStatus === 'pending' || o.preAuthStatus === 'partial')
    );

    return {
      thisMonth: {
        orderCount:   thisMonth.length,
        totalRevenue: thisMonth.reduce((s, o) => s + (o.totalRevenue || 0), 0),
        cashProfit:   thisMonth.reduce((s, o) => s + (o.cashProfit   || 0), 0),
        pointsValue:  thisMonth.reduce((s, o) => s + (o.pointsValue  || 0), 0),
        preAuthPending: pending.length,
      },
      allTime: {
        orderCount:   orders.filter(o => o.status !== 'cancelled').length,
        totalRevenue: orders.filter(o => o.status !== 'cancelled')
                            .reduce((s, o) => s + (o.totalRevenue || 0), 0),
      },
    };
  }

  async getMonthlyTrend(): Promise<object[]> {
    const state  = await readState();
    const orders = state.orders.filter(o => o.status !== 'cancelled');

    // 近 12 个月
    const months: Record<string, { month: string; cashProfit: number; pointsValue: number; orderCount: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { month: key, cashProfit: 0, pointsValue: 0, orderCount: 0 };
    }

    for (const o of orders) {
      const key = o.createdAt.slice(0, 7);
      if (months[key]) {
        months[key].cashProfit  += o.cashProfit  || 0;
        months[key].pointsValue += o.pointsValue || 0;
        months[key].orderCount  += 1;
      }
    }

    return Object.values(months);
  }

  async getByCity(): Promise<object[]> {
    const state  = await readState();
    const orders = state.orders.filter(o => o.status !== 'cancelled');
    const map: Record<string, { city: string; orderCount: number; totalRevenue: number; cashProfit: number }> = {};

    for (const o of orders) {
      if (!map[o.city]) map[o.city] = { city: o.city, orderCount: 0, totalRevenue: 0, cashProfit: 0 };
      map[o.city].orderCount  += 1;
      map[o.city].totalRevenue += o.totalRevenue || 0;
      map[o.city].cashProfit  += o.cashProfit   || 0;
    }

    return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  async getByGroup(): Promise<object[]> {
    const state  = await readState();
    const orders = state.orders.filter(o => o.status !== 'cancelled');
    const map: Record<string, { hotelGroup: string; orderCount: number; totalRevenue: number; cashProfit: number; pointsValue: number }> = {};

    for (const o of orders) {
      const g = o.hotelGroup || '其他';
      if (!map[g]) map[g] = { hotelGroup: g, orderCount: 0, totalRevenue: 0, cashProfit: 0, pointsValue: 0 };
      map[g].orderCount   += 1;
      map[g].totalRevenue += o.totalRevenue || 0;
      map[g].cashProfit   += o.cashProfit   || 0;
      map[g].pointsValue  += o.pointsValue  || 0;
    }

    return Object.values(map)
      .map(g => ({ ...g, avgPerOrder: g.orderCount > 0 ? Math.round(g.totalRevenue / g.orderCount) : 0 }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  async getByType(): Promise<object[]> {
    const state  = await readState();
    const orders = state.orders.filter(o => o.status !== 'cancelled');
    const map: Record<string, { orderType: string; orderCount: number; totalRevenue: number }> = {};

    for (const o of orders) {
      if (!map[o.orderType]) map[o.orderType] = { orderType: o.orderType, orderCount: 0, totalRevenue: 0 };
      map[o.orderType].orderCount  += 1;
      map[o.orderType].totalRevenue += o.totalRevenue || 0;
    }

    return Object.values(map)
      .map(t => ({ ...t, avgPerOrder: t.orderCount > 0 ? Math.round(t.totalRevenue / t.orderCount) : 0 }))
      .sort((a, b) => b.orderCount - a.orderCount);
  }

  async getPreAuthPending(): Promise<object[]> {
    const state  = await readState();
    const now    = new Date();
    return state.orders
      .filter(o =>
        o.preAuth && o.preAuth > 0 &&
        (o.preAuthStatus === 'pending' || o.preAuthStatus === 'partial')
      )
      .map(o => {
        const checkInDays = Math.floor(
          (now.getTime() - new Date(o.checkIn).getTime()) / 86400000
        );
        return {
          id:             o.id,
          customerName:   o.customerName,
          hotelName:      o.hotelName,
          checkIn:        o.checkIn,
          checkOut:       o.checkOut,
          preAuth:        o.preAuth,
          preAuthRefund:  o.preAuthRefund,
          preAuthStatus:  o.preAuthStatus,
          overdue:        checkInDays > 7,  // 入住超7天未退视为超时
        };
      })
      .sort((a, b) => (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0));
  }
}

export const orderService = new OrderService();
