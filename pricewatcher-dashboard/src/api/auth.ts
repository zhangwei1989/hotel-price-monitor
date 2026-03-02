import { http } from './http';

export async function login(username: string, password: string): Promise<{ token: string }> {
  const resp = await http.post('/api/auth/login', { username, password });
  return resp.data;
}

export async function verify(): Promise<{ valid: boolean }> {
  const resp = await http.get('/api/auth/verify');
  return resp.data;
}
