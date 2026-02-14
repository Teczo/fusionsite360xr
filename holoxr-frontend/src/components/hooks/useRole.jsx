import { createContext, useContext, useState, useEffect } from 'react';
import { userApi } from '../../services/api';

const RoleContext = createContext({ role: 'admin', isAdmin: true });

export function RoleProvider({ children }) {
  const [role, setRole] = useState('admin');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    userApi.me()
      .then((u) => setRole(u.role || 'admin'))
      .catch(() => setRole('admin'));
  }, [token]);

  const isAdmin = role === 'admin';
  const canEdit = role === 'admin';
  const canUploadMedia = role === 'admin' || role === 'contractor';

  return (
    <RoleContext.Provider value={{ role, isAdmin, canEdit, canUploadMedia }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
