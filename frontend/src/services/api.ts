/**
 * IP-SAKTI API Service Layer
 * Connects frontend components to the ACTUAL backend endpoints:
 * - POST /api/chats (Create chat: { title })
 * - GET /api/chats (List chats for authenticated user)
 * - GET /api/chats/:id (Get chat details & full message history)
 * - DELETE /api/chats/:id (Delete chat & messages)
 * - POST /api/chats/:chatId/messages (Send message: { text })
 * - GET /api/users/profile (Get user profile)
 * - POST /api/auth/login (Login: { email, password })
 * - POST /api/auth/signup (Signup: { email, password, name })
 * - POST /api/auth/verify-email (Verify email OTP: { email, otp, hashPayload })
 * - POST /api/auth/refresh (Refresh token: { refreshToken })
 */

export type Mode = "india" | "international";

export interface Citation {
  source: string;
  header_path: string[];
  url: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[] | null;
  confidence?: "high" | "medium" | "low" | null;
  jurisdiction?: Mode | null;
  createdAt: string;
}

export interface Chat {
  id: string;
  title?: string | null;
  mode: Mode;
  createdAt: string;
}

export interface ChatDetails {
  id: string;
  title?: string | null;
  mode: Mode;
  createdAt: string;
  messages: Message[];
}

export interface UserProfile {
  name: string;
  email: string;
}

export interface SendMessagePayload {
  chatId: string;
  text: string;
  mode?: Mode;
  file?: File | null;
}

export interface SendMessageResponse {
  userMessage: Message;
  assistantMessage: Message;
}

export const API_BASE_URL =
  (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env
    ?.VITE_API_BASE_URL || "http://localhost:5000";

/* =========================================================
   AUTH & TOKEN HELPERS
========================================================= */

export function getAccessToken(): string | null {
  const token = localStorage.getItem("accessToken");
  if (!token || token === "undefined" || token === "null") {
    return null;
  }
  return token;
}

export function getUserId(): string | null {
  const directId = localStorage.getItem("userId");
  if (directId && directId !== "undefined" && directId !== "null") {
    return directId;
  }

  // Fallback: decode userId from accessToken payload
  const token = getAccessToken();
  if (token) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const extracted = payload.userId || payload.id || payload._id || payload.sub;
        if (extracted) {
          localStorage.setItem("userId", String(extracted));
          return String(extracted);
        }
      }
    } catch {
      // Ignore token decode errors
    }
  }

  return null;
}

export function clearAuth(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userId");
}

/* =========================================================
   BASE API FETCH
========================================================= */

async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkError) {
    console.error(`Network error when calling ${endpoint}:`, networkError);
    throw new Error(
      `Unable to connect to the backend server. Please ensure the backend is running at ${API_BASE_URL}.`
    );
  }

  if (!response.ok) {
    let errorData: { error?: string; message?: string; details?: Record<string, unknown> } = {};
    try {
      errorData = await response.json();
    } catch {
      // Non-JSON response body
    }

    const errorMessage =
      errorData.error ||
      errorData.message ||
      (errorData.details ? JSON.stringify(errorData.details) : undefined);

    if (response.status === 401) {
      clearAuth();
      throw new Error(errorMessage || "Your session has expired. Please log in again.");
    }
    if (response.status === 403) {
      throw new Error(
        errorMessage || "Access forbidden. Please verify your email or log in with the correct account."
      );
    }
    if (response.status === 404) {
      throw new Error(errorMessage || "The requested resource was not found.");
    }
    if (response.status === 500) {
      throw new Error(errorMessage || "Internal server error. Please try again later.");
    }

    throw new Error(
      errorMessage || `Request failed with status ${response.status}.`
    );
  }

  return response;
}

/* =========================================================
   CHAT SERVICE FUNCTIONS
========================================================= */

/**
 * Fetch all previous chats for the authenticated user (sidebar Recent section).
 * Endpoint: GET /api/chats
 * Backend returns: { chats: [...], pagination: { total, limit, offset, hasMore } }
 */
export async function fetchChats(): Promise<Chat[]> {
  const response = await apiFetch("/api/chats");
  const data = await response.json();

  const rawChats = Array.isArray(data.chats)
    ? data.chats
    : Array.isArray(data)
    ? data
    : [];

  return rawChats.map((item: any) => ({
    id: item.id || item._id,
    title: item.title || "New Chat",
    mode: "india", // Backend message jurisdiction defaults to india
    createdAt: item.createdAt || new Date().toISOString(),
  }));
}

/**
 * Fetch chat details including its messages.
 * Endpoint: GET /api/chats/:id
 * Backend returns: { id, userId, title, createdAt, messages: [...] }
 */
export async function fetchChatDetail(chatId: string): Promise<ChatDetails> {
  const response = await apiFetch(`/api/chats/${chatId}`);
  const data = await response.json();

  const rawMessages = Array.isArray(data.messages) ? data.messages : [];
  const messages: Message[] = rawMessages.map((m: any) => ({
    id: m.id || m._id,
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content || m.text || "",
    citations: m.citations || null,
    confidence: m.confidence || null,
    jurisdiction: (m.jurisdiction as Mode) || "india",
    createdAt: m.createdAt || new Date().toISOString(),
  }));

  return {
    id: data.id || data._id || chatId,
    title: data.title || "New Chat",
    mode: "india",
    createdAt: data.createdAt || new Date().toISOString(),
    messages,
  };
}

/**
 * Create a new chat session on the backend.
 * Endpoint: POST /api/chats
 * Backend expects: { title?: string }
 */
export async function createChat(title: string = "New Chat"): Promise<Chat> {
  const response = await apiFetch("/api/chats", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  const raw = await response.json();
  return {
    id: raw.id || raw._id,
    title: raw.title || title,
    mode: "india",
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

/**
 * Delete a chat session.
 * Endpoint: DELETE /api/chats/:id
 */
export async function deleteChat(chatId: string): Promise<void> {
  await apiFetch(`/api/chats/${chatId}`, {
    method: "DELETE",
  });
}

/**
 * Send a message to an existing chat.
 * Endpoint: POST /api/chats/:chatId/messages
 * Backend expects: JSON { text: string }
 * Backend returns: { userMessage, assistantMessage, answer, citations, confidence, disclaimer }
 */
export async function sendMessage(
  payload: SendMessagePayload
): Promise<SendMessageResponse> {
  let messageText = payload.text;

  // Note: Backend has no file upload endpoint / storage. If user attached a file,
  // we append a note in the text content so user context is not lost.
  if (payload.file) {
    messageText = `[File attached: ${payload.file.name}]\n${messageText}`;
  }

  const response = await apiFetch(`/api/chats/${payload.chatId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: messageText }),
  });

  const data = await response.json();

  const userMsgRaw = data.userMessage || {};
  const assistantMsgRaw = data.assistantMessage || {};

  const userMessage: Message = {
    id: userMsgRaw.id || userMsgRaw._id || `user-${Date.now()}`,
    role: "user",
    content: userMsgRaw.content || userMsgRaw.text || messageText,
    citations: null,
    confidence: null,
    jurisdiction: null,
    createdAt: userMsgRaw.createdAt || new Date().toISOString(),
  };

  const assistantMessage: Message = {
    id: assistantMsgRaw.id || assistantMsgRaw._id || `assistant-${Date.now()}`,
    role: "assistant",
    content:
      assistantMsgRaw.content ||
      data.answer ||
      assistantMsgRaw.text ||
      "No response content received.",
    citations: assistantMsgRaw.citations || data.citations || null,
    confidence: assistantMsgRaw.confidence || data.confidence || "medium",
    jurisdiction: (assistantMsgRaw.jurisdiction as Mode) || "india",
    createdAt: assistantMsgRaw.createdAt || new Date().toISOString(),
  };

  return { userMessage, assistantMessage };
}

/**
 * Fetch authenticated user's profile.
 * Endpoint: GET /api/users/profile
 * Backend returns: { user: { id, email, name, role, emailVerified, createdAt } }
 */
export async function fetchUserProfile(): Promise<UserProfile> {
  const response = await apiFetch("/api/users/profile");
  const data = await response.json();

  return {
    name: data.user?.name || "User",
    email: data.user?.email || "",
  };
}
