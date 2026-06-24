import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchMe,
  login as loginRequest,
  register as registerRequest,
  updatePreferences as updatePreferencesRequest,
  uploadAvatar as uploadAvatarRequest
} from "../api/auth";
import { tokenStorageKey } from "../lib/api";
import type { LanguageCode, PublicUser } from "../types";

type AuthContextValue = {
  user: PublicUser | null;
  token: string | null;
  isBootstrapping: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: {
    username: string;
    email: string;
    password: string;
    preferredLanguage: LanguageCode;
  }) => Promise<void>;
  logout: () => void;
  updatePreferences: (payload: {
    preferredLanguage?: LanguageCode;
    autoTranslateEnabled?: boolean;
    regionalSlangMode?: boolean;
  }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(tokenStorageKey));
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsBootstrapping(false);
      return;
    }

    fetchMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(tokenStorageKey);
        setToken(null);
      })
      .finally(() => setIsBootstrapping(false));
  }, [token]);

  const persistSession = useCallback((nextToken: string, nextUser: PublicUser) => {
    localStorage.setItem(tokenStorageKey, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (payload: { email: string; password: string }) => {
      const response = await loginRequest(payload);
      persistSession(response.token, response.user);
    },
    [persistSession]
  );

  const register = useCallback(
    async (payload: {
      username: string;
      email: string;
      password: string;
      preferredLanguage: LanguageCode;
    }) => {
      const response = await registerRequest(payload);
      persistSession(response.token, response.user);
    },
    [persistSession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(tokenStorageKey);
    setUser(null);
    setToken(null);
  }, []);

  const updatePreferences = useCallback(
    async (payload: {
      preferredLanguage?: LanguageCode;
      autoTranslateEnabled?: boolean;
      regionalSlangMode?: boolean;
    }) => {
      const nextUser = await updatePreferencesRequest(payload);
      setUser(nextUser);
    },
    []
  );

  const uploadAvatar = useCallback(async (file: File) => {
    const nextUser = await uploadAvatarRequest(file);
    setUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isBootstrapping,
      login,
      register,
      logout,
      updatePreferences,
      uploadAvatar
    }),
    [isBootstrapping, login, logout, register, token, updatePreferences, uploadAvatar, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
