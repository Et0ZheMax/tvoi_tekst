"use client";

import { useEffect, useState } from "react";
import { fetchChats, logout } from "../../lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ChatsPage() {
  const [chats, setChats] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchChats()
      .then((data) => setChats(data.chats))
      .catch((err) => setError(err instanceof Error ? err.message : "Ошибка"));
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <main style={{ display: "grid", gridTemplateColumns: "320px 1fr", minHeight: "100vh" }}>
      <aside style={{ padding: "1.5rem", background: "var(--surface)", borderRight: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Чаты</h2>
          <button onClick={handleLogout} style={{ border: "none", background: "transparent", color: "var(--primary)" }}>
            Выйти
          </button>
        </div>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
          {chats.map((chat) => (
            <li key={chat.id} style={{ background: "var(--bg)", padding: "0.75rem", borderRadius: 10 }}>
              <Link href={`/chats/${chat.id}`}>Чат {chat.id.slice(0, 6)}</Link>
            </li>
          ))}
        </ul>
      </aside>
      <section style={{ display: "grid", placeItems: "center" }}>
        <p style={{ color: "var(--muted)" }}>Выберите чат слева</p>
      </section>
    </main>
  );
}
