"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchMessages, sendMessage, getAccessToken } from "../../../lib/api";
import { useParams } from "next/navigation";
import { io } from "socket.io-client";
import Link from "next/link";

export default function ChatPage() {
  const params = useParams();
  const chatId = params?.id as string;
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [presence, setPresence] = useState<Record<string, string>>({});

  const socket = useMemo(() => {
    const token = getAccessToken();
    return io(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001", {
      auth: { token }
    });
  }, []);

  useEffect(() => {
    fetchMessages(chatId).then((data) => setMessages(data.messages.reverse()));
  }, [chatId]);

  useEffect(() => {
    socket.emit("join", chatId);

    socket.on("message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("typing", (payload) => {
      setTypingUsers((prev) => {
        const exists = prev.includes(payload.userId);
        if (payload.isTyping && !exists) return [...prev, payload.userId];
        if (!payload.isTyping) return prev.filter((id) => id !== payload.userId);
        return prev;
      });
    });

    socket.on("presence", (payload) => {
      setPresence((prev) => ({ ...prev, [payload.userId]: payload.status }));
    });

    return () => {
      socket.disconnect();
    };
  }, [chatId, socket]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    const response = await sendMessage(chatId, input);
    setMessages((prev) => [...prev, response.message]);
    setInput("");
  };

  const handleTyping = (value: string) => {
    setInput(value);
    socket.emit("typing", { chatId, isTyping: value.length > 0 });
  };

  return (
    <main style={{ display: "grid", gridTemplateColumns: "320px 1fr", minHeight: "100vh" }}>
      <aside style={{ padding: "1.5rem", background: "var(--surface)", borderRight: "1px solid var(--border)" }}>
        <Link href="/chats">← Назад</Link>
        <h2>Чат {chatId.slice(0, 6)}</h2>
        <p style={{ color: "var(--muted)" }}>Онлайн: {Object.values(presence).filter((v) => v === "online").length}</p>
      </aside>
      <section style={{ display: "grid", gridTemplateRows: "1fr auto", padding: "1.5rem" }}>
        <div style={{ overflowY: "auto", display: "grid", gap: "0.75rem" }}>
          {messages.map((message) => (
            <div key={message.id} style={{ background: "var(--surface)", padding: "0.75rem", borderRadius: 10 }}>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{message.sender?.displayName ?? ""}</div>
              <div>{message.body}</div>
            </div>
          ))}
        </div>
        {typingUsers.length > 0 && (
          <p style={{ color: "var(--muted)" }}>Печатает: {typingUsers.join(", ")}</p>
        )}
        <form onSubmit={handleSend} style={{ display: "flex", gap: "0.5rem" }}>
          <input
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Сообщение"
            style={{ flex: 1, padding: "0.75rem", borderRadius: 8, border: "1px solid var(--border)" }}
          />
          <button type="submit" style={{ background: "var(--primary)", color: "white", border: "none", padding: "0 1rem", borderRadius: 8 }}>
            Отправить
          </button>
        </form>
      </section>
    </main>
  );
}
