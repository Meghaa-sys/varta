import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export const tokenStorageKey = "ai-chat-token";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(tokenStorageKey);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const apiErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.message ?? error.message);
  }

  return error instanceof Error ? error.message : "Something went wrong";
};
