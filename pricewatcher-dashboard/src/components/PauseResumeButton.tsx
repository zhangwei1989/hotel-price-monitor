import React, { useState } from 'react';
import { Button, message } from 'antd';
import { pauseTask, resumeTask } from '../api/taskActions';

export function PauseResumeButton({ id, enabled, onChanged }: { id: string; enabled: boolean; onChanged?: () => void }) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      if (enabled) {
        await pauseTask(id);
        message.success('已暂停');
      } else {
        await resumeTask(id);
        message.success('已恢复');
      }
      onChanged?.();
    } catch (e: any) {
      message.error(e?.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="small" loading={loading} onClick={onClick}>
      {enabled ? '暂停' : '恢复'}
    </Button>
  );
}
