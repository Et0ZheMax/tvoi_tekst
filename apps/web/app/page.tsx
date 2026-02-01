"use client";

import { useState } from "react";
import { login, register } from "../lib/api";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      if (mode === "register") {
        await register({ email, password, displayName });
      } else {
        await login({ email, password });
      }
      router.push("/chats");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  };

  return (
    <main style={{ display: "grid", placeItems: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 420, background: "var(--surface)", padding: "2rem", borderRadius: 12 }}>
        <h1 style={{ marginTop: 0 }}>Tvoi Tekst</h1>
        <p style={{ color: "var(--muted)" }}>Войти или зарегистрироваться</p>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {mode === "register" && (
            <input
              type="text"
              placeholder="Имя"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          )}
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div style={{ color: "crimson" }}>{error}</div>}
          <button type="submit" style={{ background: "var(--primary)", color: "white", border: "none", padding: "0.75rem", borderRadius: 8 }}>
            {mode === "register" ? "Создать аккаунт" : "Войти"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          style={{ marginTop: "1rem", background: "transparent", border: "none", color: "var(--primary)", cursor: "pointer" }}
        >
          {mode === "login" ? "Нужен аккаунт? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
        </button>
      </div>
    </main>
  );
}
