import { api } from "../lib/api";
import type { LanguageCode, PublicUser } from "../types";

export type AuthResponse = {
  user: PublicUser;
  token: string;
};

export const register = (payload: {
  username: string;
  email: string;
  password: string;
  preferredLanguage: LanguageCode;
}) => api.post<AuthResponse>("/auth/register", payload).then((res) => res.data);

export const login = (payload: { email: string; password: string }) =>
  api.post<AuthResponse>("/auth/login", payload).then((res) => res.data);

export const fetchMe = () => api.get<{ user: PublicUser }>("/auth/me").then((res) => res.data.user);

export const updatePreferences = (payload: {
  preferredLanguage?: LanguageCode;
  autoTranslateEnabled?: boolean;
  regionalSlangMode?: boolean;
}) => api.patch<{ user: PublicUser }>("/auth/me/preferences", payload).then((res) => res.data.user);

export const uploadAvatar = (file: File) => {
  const form = new FormData();
  form.append("avatar", file);
  return api.post<{ user: PublicUser }>("/auth/me/avatar", form).then((res) => res.data.user);
};

export const searchUsers = (query: string) =>
  api.get<{ users: PublicUser[] }>("/auth/users/search", { params: { q: query } }).then((res) => res.data.users);
export const getUserByUsername = (username: string) =>
  api.get<{ user: PublicUser }>(`/auth/users/${encodeURIComponent(username)}`).then((res) => res.data.user);