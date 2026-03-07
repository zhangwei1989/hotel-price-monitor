import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import 'antd/dist/reset.css';

import { theme } from './theme';
import Login from './pages/Login';
import { PrivateRoute } from './components/PrivateRoute';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Analytics from './pages/Analytics';
import AiAdvisor from './pages/AiAdvisor';
import AgentKnowledge from './pages/AgentKnowledge';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Navigate to="/tasks" replace /></PrivateRoute>} />
          <Route path="/tasks" element={<PrivateRoute><Tasks /></PrivateRoute>} />
          <Route path="/tasks/:id" element={<PrivateRoute><TaskDetail /></PrivateRoute>} />
          <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
          <Route path="/orders/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
          <Route path="/ai-advisor" element={<PrivateRoute><AiAdvisor /></PrivateRoute>} />
          <Route path="/agent-knowledge" element={<PrivateRoute><AgentKnowledge /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
