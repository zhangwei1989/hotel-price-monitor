import { useState } from 'react';
import { Button, Card, Checkbox, Form, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { login as loginApi } from '../api/auth';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onFinish(values: any) {
    setLoading(true);
    try {
      const { token } = await loginApi(values.username, values.password);
      if (values.remember) localStorage.setItem('pw_token', token);
      else sessionStorage.setItem('pw_token', token);
      message.success('登录成功');
      navigate('/');
    } catch (e: any) {
      message.error(e?.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f5f5' }}>
      <Card title="PriceWatcher Dashboard" style={{ width: 360 }}>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ remember: true }}>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input placeholder="admin" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password placeholder="请输入密码" autoComplete="current-password" />
          </Form.Item>
          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>记住我（7天）</Checkbox>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
