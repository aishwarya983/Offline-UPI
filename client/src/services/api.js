import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("offline_upi_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function extractErrorMessage(err) {
  return (
    err?.response?.data?.error ||
    err?.message ||
    "Something went wrong. Check your connection and try again."
  );
}

// --- auth ---
export const registerUser = (payload) => api.post("/auth/register", payload);
export const loginUser = (payload) => api.post("/auth/login", payload);
export const fetchMe = () => api.get("/auth/me");

// --- account ---
export const fetchAccount = () => api.get("/account");

// --- users (for choosing a receiver) ---
export const searchUsers = (search) =>
  api.get("/users", { params: search ? { search } : {} });

// --- transactions ---
export const createTransaction = (payload) => api.post("/transactions", payload);
export const syncTransactions = (transactions) =>
  api.post("/transactions/sync", { transactions });
export const fetchTransactions = (params) => api.get("/transactions", { params });
export const fetchTransaction = (id) => api.get(`/transactions/${id}`);
