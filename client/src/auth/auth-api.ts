import { apiFetch, jsonBody } from "../api/http";
import type { AuthUser } from "../api/types";

export function loadCurrentUser(): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>("/api/auth/me");
}

export function signInRequest(email: string, password: string): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body: jsonBody({ email, password }),
  });
}

export function registerRequest(email: string, password: string): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>("/api/auth/register", {
    method: "POST",
    body: jsonBody({ email, password }),
  });
}

export function signOutRequest(): Promise<void> {
  return apiFetch<void>("/api/auth/logout", { method: "POST" });
}
