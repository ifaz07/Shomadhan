import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const { data } = await authAPI.getMe();
      const nextUser = data.data.user;
      setUser(nextUser);
      return nextUser;
    } catch {
      localStorage.removeItem('token');
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    const { data } = await authAPI.login(credentials);
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('loginTime', new Date().toISOString());
    setUser(data.data.user);
    toast.success('Welcome back!');
    return data;
  };

  const register = async (userData) => {
    const { data } = await authAPI.register(userData);
    const nextUser = data.data.user;
    const shouldPersistSession = Boolean(data.data.token) && nextUser?.isActive !== false;

    if (shouldPersistSession) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('loginTime', new Date().toISOString());
        setUser(nextUser);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('loginTime');
      setUser(null);
    }

    toast.success('Account created successfully!');
    return data;
  };

  // Used by OAuthCallbackPage after Google/Facebook login
  const loginWithToken = async (token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('loginTime', new Date().toISOString());
    return await fetchUser();
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Proceed with logout even if API call fails
    }
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Logged out');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loginWithToken, getMe: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};
