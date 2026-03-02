import React from 'react';
import { Navigate } from 'react-router-dom';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('pw_token') || sessionStorage.getItem('pw_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
