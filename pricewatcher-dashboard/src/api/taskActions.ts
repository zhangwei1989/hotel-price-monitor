import { http } from './http';

export async function pauseTask(id: string) {
  const resp = await http.post(`/api/task-actions/${id}/pause`);
  return resp.data;
}

export async function resumeTask(id: string) {
  const resp = await http.post(`/api/task-actions/${id}/resume`);
  return resp.data;
}
