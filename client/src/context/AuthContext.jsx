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
      // Token may be expired or the server may be unavailable.
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  async function login(email, password) {
    try {
      const { data } = await loginUser({ email, password });

      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Unable to sign in. Please check your connection and try again.";

      throw new Error(message);
    }
  }

  async function register(name, email, password) {
    try {
      const { data } = await registerUser({ name, email, password });

      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Unable to create your account. Please check your connection and try again.";

      throw new Error(message);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  // Called after a successful payment so the header balance stays current.
  function updateBalance(balance) {
    setUser((prev) => (prev ? { ...prev, balance } : prev));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}
