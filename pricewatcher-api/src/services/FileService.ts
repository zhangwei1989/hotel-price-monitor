import fs from 'fs/promises';
import path from 'path';
import { AuthConfig, MonitorState } from '../types';

/**
 * 轻量级异步互斥锁（无需额外依赖）
 * 保证同一时刻只有一个写操作在执行，防止并发写入损坏 JSON 文件
 */
class AsyncMutex {
  private queue: Promise<void> = Promise.resolve();

  lock<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.queue.then(() => fn());
    // 捕获错误防止 queue 中断
    this.queue = result.then(() => {}, () => {});
    return result;
  }
}

export class FileService {
  private authConfigPath: string;
  private statePath: string;
  private stateMutex = new AsyncMutex();

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

  /**
   * 写入 state.json（带互斥锁）
   * 先写临时文件再 rename，保证原子性：
   * - 即使写入中途崩溃，原文件不会损坏
   */
  async writeMonitorState(state: MonitorState): Promise<void> {
    await this.stateMutex.lock(async () => {
      const tmp = this.statePath + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(state, null, 2));
      await fs.rename(tmp, this.statePath);
    });
  }

  /**
   * 原子读改写（推荐用这个替代 read + write 分开调用）
   * 在锁内读取最新数据，修改后写回，避免 ABA 问题
   */
  async updateMonitorState(
    updater: (state: MonitorState) => MonitorState | Promise<MonitorState>
  ): Promise<MonitorState> {
    return this.stateMutex.lock(async () => {
      const content = await fs.readFile(this.statePath, 'utf-8');
      const state = JSON.parse(content) as MonitorState;
      const updated = await updater(state);
      const tmp = this.statePath + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(updated, null, 2));
      await fs.rename(tmp, this.statePath);
      return updated;
    });
  }
}

export const fileService = new FileService();
