import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { ApiError } from "../api/http";
import type { AuthUser } from "../api/types";
import {
  loadCurrentUser,
  registerRequest,
  signInRequest,
  signOutRequest,
} from "./auth-api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  signIn(email: string, password: string): Promise<void>;
  register(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  clearError(): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await loadCurrentUser();
      setUser(result.user);
      setStatus("authenticated");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }
      setError(messageFor(requestError));
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const result = await signInRequest(email, password);
      setUser(result.user);
      setStatus("authenticated");
      setError(null);
    } catch (requestError) {
      setError(messageFor(requestError));
      throw requestError;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      const result = await registerRequest(email, password);
      setUser(result.user);
      setStatus("authenticated");
      setError(null);
    } catch (requestError) {
      setError(messageFor(requestError));
      throw requestError;
    }
  }, []);

  const signOut = useCallback(async () => {
    await signOutRequest();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      error,
      signIn,
      register,
      signOut,
      clearError: () => setError(null),
    }),
    [error, register, signIn, signOut, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
