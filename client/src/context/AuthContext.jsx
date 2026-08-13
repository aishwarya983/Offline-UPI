import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchMe, loginUser, registerUser } from "../services/api.js";

const AuthContext = createContext(null);
const TOKEN_KEY = "offline_upi_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await fetchMe();
      setUser(data.user);
    } catch {
      // token expired or the app is offline on first load - either way
      // we can't confirm the session, so treat as logged out for now
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  async function login(email, password) {
    const { data } = await loginUser({ email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
  }

  async function register(name, email, password) {
    const { data } = await registerUser({ name, email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  // called after a successful payment so the header balance stays current
  function updateBalance(balance) {
    setUser((prev) => (prev ? { ...prev, balance } : prev));
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateBalance }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
