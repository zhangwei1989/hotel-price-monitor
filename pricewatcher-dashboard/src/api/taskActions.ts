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
  // 并发删除，收集结果
  const results = await Promise.allSettled(
    ids.map(id => http.delete(`/api/tasks/${id}`))
  );
  const failed = results.filter(r => r.status === 'rejected').length;
  return { deleted: ids.length - failed, failed };
}
