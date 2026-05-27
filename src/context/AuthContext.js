import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('finapp_session')) || null; }
    catch { return null; }
  });

  const getUsers = () => {
    try { return JSON.parse(localStorage.getItem('finapp_users')) || []; }
    catch { return []; }
  };

  const saveUsers = (users) => {
    localStorage.setItem('finapp_users', JSON.stringify(users));
  };

  const register = (name, email, password) => {
    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Email already registered');
    }
    const user = { id: uuidv4(), name, email: email.toLowerCase(), password, createdAt: Date.now() };
    saveUsers([...users, user]);
    const session = { id: user.id, name: user.name, email: user.email };
    setCurrentUser(session);
    localStorage.setItem('finapp_session', JSON.stringify(session));
    return session;
  };

  const login = (email, password) => {
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) throw new Error('Invalid email or password');
    const session = { id: user.id, name: user.name, email: user.email };
    setCurrentUser(session);
    localStorage.setItem('finapp_session', JSON.stringify(session));
    return session;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('finapp_session');
  };

  const findUserByEmail = (email) => {
    const users = getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  };

  const getAllUsers = () => getUsers().map(u => ({ id: u.id, name: u.name, email: u.email }));

  return (
    <AuthContext.Provider value={{ currentUser, register, login, logout, findUserByEmail, getAllUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
