import fs from 'fs/promises';
import path from 'path';
import { AuthConfig, MonitorState } from '../types';

export class FileService {
  private authConfigPath: string;
  private statePath: string;

  constructor() {
    this.authConfigPath = path.join(__dirname, '../../../pricewatcher-auth.json');
    this.statePath = path.join(__dirname, '../../../ctrip-monitor-state.json');
  }

  async readAuthConfig(): Promise<AuthConfig> {
    const content = await fs.readFile(this.authConfigPath, 'utf-8');
    return JSON.parse(content);
  }

  async writeAuthConfig(config: AuthConfig): Promise<void> {
    await fs.writeFile(this.authConfigPath, JSON.stringify(config, null, 2));
  }

  async readMonitorState(): Promise<MonitorState> {
    const content = await fs.readFile(this.statePath, 'utf-8');
    return JSON.parse(content);
  }

  async writeMonitorState(state: MonitorState): Promise<void> {
    await fs.writeFile(this.statePath, JSON.stringify(state, null, 2));
  }
}

export const fileService = new FileService();
