import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import 'antd/dist/reset.css';
import Login from './pages/Login';
import { PrivateRoute } from './components/PrivateRoute';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Navigate to="/tasks" replace /></PrivateRoute>} />
        <Route path="/tasks" element={<PrivateRoute><Tasks /></PrivateRoute>} />
        <Route path="/tasks/:id" element={<PrivateRoute><TaskDetail /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
