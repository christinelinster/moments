import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthProvider";

function Harness() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="email">{auth.user?.email ?? "none"}</span>
      <button onClick={() => void auth.signIn("person@example.com", "password")}>Sign in</button>
    </div>
  );
}

describe("AuthProvider", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("loads the current session and exposes the signed-in user", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ user: { id: "user-1", email: "person@example.com", createdAt: "2026-01-01T00:00:00.000Z" } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<AuthProvider><Harness /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("authenticated"));
    expect(screen.getByTestId("email")).toHaveTextContent("person@example.com");
  });

  it("returns to authenticated state after a sign-in action", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "UNAUTHENTICATED" }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: "user-1", email: "person@example.com", createdAt: "2026-01-01T00:00:00.000Z" } }), { status: 200 }));

    render(<AuthProvider><Harness /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"));

    await act(async () => {
      screen.getByRole("button", { name: "Sign in" }).click();
    });
    expect(screen.getByTestId("email")).toHaveTextContent("person@example.com");
  });
});
