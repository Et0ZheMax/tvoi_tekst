export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type User = {
  id: string;
  email: string;
  displayName: string;
};

export const getAccessToken = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("access_token");
};

export const setAccessToken = (token: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("access_token", token);
};

export const clearAccessToken = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("access_token");
};

const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });

  if (response.status === 401 && token) {
    const refresh = await fetch(`${API_URL}/api/auth/refresh`, { method: "POST", credentials: "include" });
    if (refresh.ok) {
      const data = await refresh.json();
      setAccessToken(data.accessToken);
      return apiFetch(path, options);
    }
  }

  return response;
};

export const register = async (payload: { email: string; password: string; displayName: string }) => {
  const response = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Registration failed");
  }
  setAccessToken(data.accessToken);
  return data.user as User;
};

export const login = async (payload: { email: string; password: string }) => {
  const response = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Login failed");
  }
  setAccessToken(data.accessToken);
  return data.user as User;
};

export const logout = async () => {
  await apiFetch("/api/auth/logout", { method: "POST" });
  clearAccessToken();
};

export const fetchChats = async () => {
  const response = await apiFetch("/api/chats");
  if (!response.ok) throw new Error("Failed to load chats");
  return response.json();
};

export const createDm = async (peerId: string) => {
  const response = await apiFetch("/api/chats/dm", {
    method: "POST",
    body: JSON.stringify({ peerId })
  });
  if (!response.ok) throw new Error("Failed to create chat");
  return response.json();
};

export const fetchMessages = async (chatId: string) => {
  const response = await apiFetch(`/api/messages/chat/${chatId}`);
  if (!response.ok) throw new Error("Failed to load messages");
  return response.json();
};

export const sendMessage = async (chatId: string, body: string) => {
  const response = await apiFetch("/api/messages", {
    method: "POST",
    body: JSON.stringify({ chatId, body })
  });
  if (!response.ok) throw new Error("Failed to send message");
  return response.json();
};
