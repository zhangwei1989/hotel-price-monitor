import { http } from './http';

export async function pauseTask(id: string) {
  const resp = await http.post(`/api/task-actions/${id}/pause`);
  return resp.data;
}

export async function resumeTask(id: string) {
  const resp = await http.post(`/api/task-actions/${id}/resume`);
  return resp.data;
}

export async function checkNow(id: string) {
  const resp = await http.post(`/api/task-actions/${id}/check-now`);
  return resp.data;
}

export async function updateThreshold(id: string, value: number) {
  const resp = await http.patch(`/api/task-actions/${id}/threshold`, { value });
  return resp.data;
}

export async function updateFrequency(id: string, frequencyMinutes: number) {
  const resp = await http.patch(`/api/task-actions/${id}/frequency`, { frequencyMinutes });
  return resp.data;
}

export async function batchPause(ids: string[]) {
  const resp = await http.post('/api/task-actions/batch/pause', { ids });
  return resp.data;
}

export async function batchResume(ids: string[]) {
  const resp = await http.post('/api/task-actions/batch/resume', { ids });
  return resp.data;
}

export async function fetchSummary() {
  const resp = await http.get('/api/task-actions/stats/summary');
  return resp.data;
}

export async function batchDelete(ids: string[]) {
  const resp = await http.post('/api/task-actions/batch/delete', { ids });
  return resp.data as { deleted: number; failed: number; results: { id: string; ok: boolean }[] };
}

export async function batchCheckNow(ids: string[]) {
  const resp = await http.post('/api/task-actions/batch/check-now', { ids });
  return resp.data as { triggered: number; failed: number; message: string };
}
