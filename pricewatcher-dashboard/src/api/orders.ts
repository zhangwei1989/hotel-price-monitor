import { http } from './http';

export interface Order {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  source: string;
  orderType: string;
  note?: string;
  customerName: string;
  customerContact: string;
  customerNeeds?: string;
  city: string;
  hotelGroup: string;
  hotelName: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  bookingMethod?: string;
  costPrice: number;
  salePrice: number;
  cashProfit: number;
  preAuth?: number;
  preAuthRefund?: number;
  preAuthStatus?: 'pending' | 'partial' | 'refunded' | null;
  pointsEarned?: number;
  pointsValue?: number;
  totalRevenue: number;
}

export interface OrderListResult {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchOrders(params: any = {}): Promise<OrderListResult> {
  const resp = await http.get('/api/orders', { params });
  return resp.data;
}

export async function fetchOrder(id: string): Promise<Order> {
  const resp = await http.get(`/api/orders/${id}`);
  return resp.data;
}

export async function createOrder(data: Partial<Order> & { [key: string]: any }): Promise<Order> {
  const resp = await http.post('/api/orders', data);
  return resp.data;
}

export async function updateOrder(id: string, data: Partial<Order> & { [key: string]: any }): Promise<Order> {
  const resp = await http.put(`/api/orders/${id}`, data);
  return resp.data;
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<Order> {
  const resp = await http.put(`/api/orders/${id}`, { status });
  return resp.data;
}

export async function deleteOrder(id: string): Promise<void> {
  await http.delete(`/api/orders/${id}`);
}

// Analytics
export async function fetchAnalyticsSummary(): Promise<any> {
  const resp = await http.get('/api/orders/analytics/summary');
  return resp.data;
}

export async function fetchAnalyticsMonthly(): Promise<any[]> {
  const resp = await http.get('/api/orders/analytics/monthly');
  return resp.data;
}

export async function fetchAnalyticsByCity(): Promise<any[]> {
  const resp = await http.get('/api/orders/analytics/by-city');
  return resp.data;
}

export async function fetchAnalyticsByGroup(): Promise<any[]> {
  const resp = await http.get('/api/orders/analytics/by-group');
  return resp.data;
}

export async function fetchAnalyticsByType(): Promise<any[]> {
  const resp = await http.get('/api/orders/analytics/by-type');
  return resp.data;
}

export async function fetchPreAuthPending(): Promise<any[]> {
  const resp = await http.get('/api/orders/analytics/pre-auth/pending');
  return resp.data;
}
