import { http } from './http';

export interface Task {
  id: string;
  hotelName: string;
  city: string;
  checkIn: string;
  checkOut: string;
  roomName: string;
  ratePlanHint: string;
  threshold: { value: number };
  lastPrice: number | null;
  lastStatus: string;
  lastCheckedAt: string;
  frequencyMinutes: number;
  autoStopDate?: string;
}

export async function fetchTasks(params: any = {}) {
  const resp = await http.get('/api/tasks', { params });
  return resp.data as { tasks: Task[]; total: number; page: number; pageSize: number };
}

export async function fetchTask(id: string) {
  const resp = await http.get(`/api/tasks/${id}`);
  return resp.data as any;
}

export async function fetchHistory(taskId: string) {
  const resp = await http.get(`/api/prices/history/${taskId}`);
  return resp.data as { taskId: string; history: any[] };
}

export async function createTask(data: Partial<Task> & { [key: string]: any }) {
  const resp = await http.post('/api/tasks', data);
  return resp.data as Task;
}

export async function deleteTask(id: string) {
  const resp = await http.delete(`/api/tasks/${id}`);
  return resp.data as { ok: boolean };
}
