import React from 'react';
import { Button, Layout, Typography } from 'antd';

export default function Home() {
  const token = localStorage.getItem('pw_token') || sessionStorage.getItem('pw_token');

  function logout() {
    localStorage.removeItem('pw_token');
    sessionStorage.removeItem('pw_token');
    window.location.href = '/login';
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>PriceWatcher Dashboard</Typography.Title>
        <div>
          <Typography.Text style={{ color: '#fff', marginRight: 12 }}>{token ? '已登录' : ''}</Typography.Text>
          <Button onClick={logout}>退出</Button>
        </div>
      </Layout.Header>
      <Layout.Content style={{ padding: 24 }}>
        <Typography.Paragraph>
          登录成功。下一步将接入任务列表与筛选。
        </Typography.Paragraph>
      </Layout.Content>
    </Layout>
  );
}
