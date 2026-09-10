import { useEffect, useRef, useState } from "react";
import {
    Plus,
    Clock3,
    MessageCircle,
    Settings,
    User,
    ChevronDown,
    Send,
    AlertCircle,
    RefreshCw,
    Edit2,
    Trash2,
    Check,
    FileText,
} from "lucide-react";

import "./MainPage.css";
import "./MainPage.additions.css";

import type {
    Mode,
    Message,
    Chat,
    UserProfile,
} from "./services/api";

import {
    fetchChats,
    fetchChatDetail,
    createChat,
    sendMessage,
    fetchUserProfile,
    updateChatTitle,
    deleteChat,
    deleteMessage,
    updateUserProfile,
    logoutApi,
    getUserId,
} from "./services/api";

export default function MainPage() {
    /* -----------------------------------------------------
       STATE
    ----------------------------------------------------- */
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [message, setMessage] = useState<string>("");
    const [mode, setMode] = useState<Mode>("india");

    const [loadingChats, setLoadingChats] = useState<boolean>(true);
    const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
    const [sendingMessage, setSendingMessage] = useState<boolean>(false);

    const [error, setError] = useState<string | null>(null);
    const [showRecent, setShowRecent] = useState<boolean>(true);
    const [showProfile, setShowProfile] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);

    // Chat title editing state
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editingChatTitle, setEditingChatTitle] = useState<string>("");

    // Profile editing state
    const [editingName, setEditingName] = useState<string>("");
    const [updatingProfile, setUpdatingProfile] = useState<boolean>(false);
    const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

    const inputRef = useRef<HTMLTextAreaElement>(null);

    /* =====================================================
       LOAD SINGLE CHAT
    ===================================================== */
    async function loadChatMessages(chatId: string): Promise<void> {
        setLoadingMessages(true);
        setError(null);

        try {
            const details = await fetchChatDetail(chatId);
            setMessages(details.messages);
            setMode(details.mode);
        } catch (err) {
            console.error("Failed to load chat messages:", err);
            setError(err instanceof Error ? err.message : "Unable to load conversation.");
        } finally {
            setLoadingMessages(false);
        }
    }

    useEffect(() => {
        let isMounted = true;

        async function init() {
            const userId = getUserId();
            if (!userId) {
                if (isMounted) {
                    setError("Please log in to load and save your chats.");
                    setLoadingChats(false);
                }
                return;
            }

            try {
                const chatList = await fetchChats();
                if (!isMounted) return;
                setChats(chatList);

                if (chatList.length > 0) {
                    const firstChat = chatList[0];
                    setActiveChatId(firstChat.id);
                    setMode(firstChat.mode);

                    const details = await fetchChatDetail(firstChat.id);
                    if (!isMounted) return;
                    setMessages(details.messages);
                    setMode(details.mode);
                }
            } catch (err) {
                if (isMounted) {
                    console.error("Failed to load initial chats:", err);
                    setError(err instanceof Error ? err.message : "Unable to load your chats.");
                }
            } finally {
                if (isMounted) {
                    setLoadingChats(false);
                }
            }
        }

        init();

        return () => {
            isMounted = false;
        };
    }, []);

    async function handleSelectChat(chatId: string): Promise<void> {
        if (chatId === activeChatId) return;
        setActiveChatId(chatId);
        setError(null);
        await loadChatMessages(chatId);
        requestAnimationFrame(() => inputRef.current?.focus());
    }

    /* =====================================================
       NEW CHAT
    ===================================================== */
    async function handleNewChat(): Promise<void> {
        setError(null);
        setMessages([]);
        setMessage("");

        inputRef.current?.focus();

        try {
            const userId = getUserId();
            if (!userId) {
                setError("Please log in to start a new chat.");
                return;
            }

            const newChat = await createChat("New Chat");
            setChats((prev) => [newChat, ...prev]);
            setActiveChatId(newChat.id);

            requestAnimationFrame(() => inputRef.current?.focus());
        } catch (err) {
            console.error("Failed to create chat on backend:", err);
            setError(err instanceof Error ? err.message : "Unable to create a new chat.");
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }

    /* =====================================================
       RENAME CHAT
    ===================================================== */
    function handleStartRenameChat(chat: Chat, e: React.MouseEvent): void {
        e.stopPropagation();
        setEditingChatId(chat.id);
        setEditingChatTitle(chat.title || "New Chat");
    }

    async function handleSaveChatTitle(chatId: string): Promise<void> {
        const trimmed = editingChatTitle.trim();
        if (!trimmed) {
            setEditingChatId(null);
            return;
        }

        try {
            await updateChatTitle(chatId, trimmed);
            setChats((prev) =>
                prev.map((c) => (c.id === chatId ? { ...c, title: trimmed } : c))
            );
        } catch (err) {
            console.error("Failed to rename chat:", err);
            setError(err instanceof Error ? err.message : "Failed to rename chat.");
        } finally {
            setEditingChatId(null);
        }
    }

    /* =====================================================
       DELETE CHAT
    ===================================================== */
    async function handleDeleteChat(chatId: string, e: React.MouseEvent): Promise<void> {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this conversation?")) return;

        try {
            await deleteChat(chatId);
            setChats((prev) => prev.filter((c) => c.id !== chatId));
            if (activeChatId === chatId) {
                setActiveChatId(null);
                setMessages([]);
            }
        } catch (err) {
            console.error("Failed to delete chat:", err);
            setError(err instanceof Error ? err.message : "Failed to delete chat.");
        }
    }

    /* =====================================================
       DELETE MESSAGE
    ===================================================== */
    async function handleDeleteMessage(messageId: string): Promise<void> {
        if (!activeChatId) return;
        if (!window.confirm("Are you sure you want to delete this message?")) return;

        try {
            await deleteMessage(activeChatId, messageId);
            setMessages((prev) => prev.filter((m) => m.id !== messageId));
        } catch (err) {
            console.error("Failed to delete message:", err);
            setError(err instanceof Error ? err.message : "Failed to delete message.");
        }
    }

    /* =====================================================
       MODE / REGION TOGGLE
    ===================================================== */
    function handleModeChange(newMode: Mode): void {
        setMode(newMode);
    }

    /* =====================================================
       SEND MESSAGE
    ===================================================== */
    async function handleSendMessage(): Promise<void> {
        const text = message.trim();
        if (!text) return;
        if (sendingMessage) return;

        const userId = getUserId();
        if (!userId) {
            setError("Please log in again.");
            return;
        }

        let targetChatId = activeChatId;

        // If no active chat exists, create one first
        if (!targetChatId) {
            try {
                const newChat = await createChat("New Chat");
                targetChatId = newChat.id;
                setActiveChatId(newChat.id);
                setChats((prev) => [newChat, ...prev]);
            } catch (err) {
                console.error("Failed to create chat before sending:", err);
                setError(err instanceof Error ? err.message : "Unable to initiate chat.");
                return;
            }
        }

        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: Message = {
            id: tempId,
            role: "user",
            content: text,
            citations: null,
            confidence: null,
            jurisdiction: mode,
            createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setMessage("");
        setSendingMessage(true);
        setError(null);

        try {
            const { userMessage, assistantMessage } = await sendMessage({
                chatId: targetChatId,
                text,
                jurisdiction: mode,
            });

            // Replace optimistic user message with actual saved user message, and append assistant response
            setMessages((prev) => [
                ...prev.filter((m) => m.id !== tempId),
                userMessage,
                assistantMessage,
            ]);

            // Refresh chat list to capture any auto-generated chat title
            const updatedChats = await fetchChats();
            setChats(updatedChats);
        } catch (err) {
            console.error("Send message error:", err);
            setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        } finally {
            setSendingMessage(false);
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }

    /* =====================================================
       PROFILE & SETTINGS
    ===================================================== */
    async function handleOpenProfile(): Promise<void> {
        setShowSettings(false);
        setShowProfile(true);
        setError(null);
        setProfileSuccess(null);

        try {
            const userId = getUserId();
            if (!userId) {
                setError("Please log in again.");
                return;
            }
            const userProfile = await fetchUserProfile();
            setProfile(userProfile);
            setEditingName(userProfile.name || "");
        } catch (err) {
            console.error("Failed to load profile:", err);
            setError(err instanceof Error ? err.message : "Unable to load profile.");
        }
    }

    async function handleSaveProfile(): Promise<void> {
        const trimmed = editingName.trim();
        if (!trimmed) return;

        setUpdatingProfile(true);
        setProfileSuccess(null);

        try {
            const updated = await updateUserProfile(trimmed);
            setProfile(updated);
            setProfileSuccess("Profile updated successfully!");
            setTimeout(() => setProfileSuccess(null), 3000);
        } catch (err) {
            console.error("Failed to update profile:", err);
            setError(err instanceof Error ? err.message : "Failed to update profile.");
        } finally {
            setUpdatingProfile(false);
        }
    }

    async function handleLogout(): Promise<void> {
        await logoutApi();
        setChats([]);
        setMessages([]);
        setActiveChatId(null);
        window.location.href = "/login";
    }

    function formatTime(date: string): string {
        try {
            return new Date(date).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return "";
        }
    }

    /* =====================================================
       RENDER
    ===================================================== */
    return (
        <div className="main-page">
            {/* SIDEBAR */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <span>IP-SAKTI</span>
                </div>

                <button
                    type="button"
                    className="new-chat-button"
                    onClick={handleNewChat}
                    title="Start a new conversation"
                >
                    <Plus size={22} />
                    <span>New Chat</span>
                </button>

                <div className="recent-section">
                    <button
                        type="button"
                        className="recent-header"
                        onClick={() => setShowRecent(!showRecent)}
                        aria-expanded={showRecent}
                    >
                        <div className="recent-title">
                            <Clock3 size={21} />
                            <span>Recent</span>
                        </div>
                        <ChevronDown
                            size={18}
                            className={showRecent ? "chevron-open" : "chevron-closed"}
                        />
                    </button>

                    {showRecent && (
                        <div className="chat-list">
                            {loadingChats ? (
                                <div className="sidebar-loading">Loading...</div>
                            ) : chats.length === 0 ? (
                                <div className="no-chats">No chats yet</div>
                            ) : (
                                chats.map((chat) => (
                                    <div
                                        key={chat.id}
                                        className={
                                            activeChatId === chat.id
                                                ? "chat-item-wrapper active"
                                                : "chat-item-wrapper"
                                        }
                                    >
                                        {editingChatId === chat.id ? (
                                            <form
                                                className="chat-rename-form"
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    handleSaveChatTitle(chat.id);
                                                }}
                                            >
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    className="chat-rename-input"
                                                    value={editingChatTitle}
                                                    onChange={(e) =>
                                                        setEditingChatTitle(e.target.value)
                                                    }
                                                    onBlur={() => handleSaveChatTitle(chat.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Escape") {
                                                            setEditingChatId(null);
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="submit"
                                                    className="chat-action-btn check"
                                                    title="Save title"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                >
                                                    <Check size={14} />
                                                </button>
                                            </form>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    className="chat-item"
                                                    onClick={() => handleSelectChat(chat.id)}
                                                    title={chat.title || "New Chat"}
                                                >
                                                    <MessageCircle size={19} />
                                                    <span className="chat-title-text">
                                                        {chat.title || "New Chat"}
                                                    </span>
                                                </button>
                                                <div className="chat-actions">
                                                    <button
                                                        type="button"
                                                        className="chat-action-btn"
                                                        onClick={(e) =>
                                                            handleStartRenameChat(chat, e)
                                                        }
                                                        title="Rename chat"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="chat-action-btn delete"
                                                        onClick={(e) =>
                                                            handleDeleteChat(chat.id, e)
                                                        }
                                                        title="Delete chat"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="sidebar-bottom">
                    <button
                        type="button"
                        className="sidebar-menu-item"
                        onClick={() => {
                            setShowSettings(!showSettings);
                            setShowProfile(false);
                        }}
                    >
                        <Settings size={22} />
                        <span>Settings</span>
                    </button>

                    {showSettings && (
                        <div className="settings-panel">
                            <button
                                type="button"
                                className="settings-item"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        className="sidebar-menu-item"
                        onClick={handleOpenProfile}
                    >
                        <User size={22} />
                        <span>Profile</span>
                    </button>
                </div>
            </aside>

            {/* CHAT AREA */}
            <main className="chat-area">
                <header className="chat-header">
                    {/* India / International Segmented Control Toggle */}
                    <div
                        className="mode-toggle"
                        role="group"
                        aria-label="Legal Jurisdiction Selection"
                    >
                        <button
                            type="button"
                            className={`mode-option ${mode === "india" ? "active" : ""}`}
                            onClick={() => handleModeChange("india")}
                        >
                            <span className="india-flag">🇮🇳</span>
                            <span>India</span>
                        </button>
                        <button
                            type="button"
                            className={`mode-option ${mode === "international" ? "active" : ""}`}
                            onClick={() => handleModeChange("international")}
                        >
                            <span>International</span>
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="error-banner" role="alert">
                        <AlertCircle size={19} />
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={() => setError(null)}
                            aria-label="Dismiss error"
                        >
                            ×
                        </button>
                    </div>
                )}

                {showProfile && (
                    <div className="profile-panel">
                        <h3>Profile</h3>
                        {profile ? (
                            <div className="profile-form">
                                <div className="profile-row">
                                    <label
                                        className="profile-label"
                                        htmlFor="profile-name-input"
                                    >
                                        Full Name
                                    </label>
                                    <div className="profile-edit-group">
                                        <input
                                            id="profile-name-input"
                                            type="text"
                                            className="profile-input"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            placeholder="Enter your name"
                                        />
                                        <button
                                            type="button"
                                            className="profile-save-btn"
                                            onClick={handleSaveProfile}
                                            disabled={updatingProfile || !editingName.trim()}
                                        >
                                            {updatingProfile ? "Saving..." : "Save"}
                                        </button>
                                    </div>
                                </div>
                                <div className="profile-row">
                                    <span className="profile-label">Email</span>
                                    <span className="profile-email-text">{profile.email}</span>
                                </div>
                                {profileSuccess && (
                                    <div className="profile-success-msg">
                                        {profileSuccess}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span>Loading profile...</span>
                        )}
                        <button
                            type="button"
                            className="profile-close"
                            onClick={() => {
                                setShowProfile(false);
                                setProfileSuccess(null);
                            }}
                        >
                            Close
                        </button>
                    </div>
                )}

                <section className="conversation">
                    {loadingMessages ? (
                        <div className="loading-chat">
                            <RefreshCw size={22} className="spin" />
                            <span>Loading conversation...</span>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="empty-chat">
                            <div className="empty-logo">✦</div>
                            <h1>How can I help you?</h1>
                            <p>Ask IP-SAKTI about Ayurveda and Intellectual Property.</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                formatTime={formatTime}
                                onDeleteMessage={handleDeleteMessage}
                            />
                        ))
                    )}

                    {sendingMessage && (
                        <div className="typing-row">
                            <div className="assistant-avatar">
                                <span>✦</span>
                            </div>
                            <div className="typing-bubble">
                                <span>IP-SAKTI is thinking</span>
                                <div className="typing-dots">
                                    <i />
                                    <i />
                                    <i />
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                <div className="input-wrapper">
                    <div className="message-input-box">
                        <textarea
                            ref={inputRef}
                            rows={1}
                            placeholder="Ask IP-SAKTI anything..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={sendingMessage}
                        />

                        <button
                            type="button"
                            className="send-button"
                            onClick={handleSendMessage}
                            disabled={sendingMessage || !message.trim()}
                            title="Send message"
                        >
                            <Send size={23} />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

/* =========================================================
   MESSAGE COMPONENT
========================================================= */

interface MessageBubbleProps {
    message: Message;
    formatTime: (date: string) => string;
    onDeleteMessage?: (messageId: string) => void;
}

function MessageBubble({ message, formatTime, onDeleteMessage }: MessageBubbleProps) {
    const [showCitations, setShowCitations] = useState<boolean>(false);

    if (message.role === "user") {
        return (
            <div className="message-row user-row">
                <div className="user-avatar">
                    <User size={22} />
                </div>
                <div className="user-message">
                    <div className="message-name">
                        <strong>You</strong>
                        <span>{formatTime(message.createdAt)}</span>
                        {onDeleteMessage && (
                            <button
                                type="button"
                                className="msg-delete-btn"
                                onClick={() => onDeleteMessage(message.id)}
                                title="Delete message"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                    <p>{message.content}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="message-row assistant-row">
            <div className="assistant-avatar">
                <span>✦</span>
            </div>
            <div className="assistant-message">
                <div className="assistant-header">
                    <div className="message-name">
                        <strong>IP-SAKTI</strong>
                        <span>{formatTime(message.createdAt)}</span>
                    </div>

                    <div className="message-metadata">
                        {message.jurisdiction && (
                            <span className="jurisdiction-tag">
                                {message.jurisdiction === "india"
                                    ? "🇮🇳 India"
                                    : "International"}
                            </span>
                        )}

                        {message.confidence && (
                            <span className={`confidence-badge ${message.confidence}`}>
                                <span className="confidence-dot" />
                                {message.confidence.charAt(0).toUpperCase() +
                                    message.confidence.slice(1)}
                            </span>
                        )}

                        {onDeleteMessage && (
                            <button
                                type="button"
                                className="msg-delete-btn"
                                onClick={() => onDeleteMessage(message.id)}
                                title="Delete message"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="answer-content">
                    <p>{message.content}</p>

                    {message.confidence === "low" && (
                        <div className="low-confidence-warning">
                            <AlertCircle size={18} />
                            <span>
                                This answer has low confidence. Please verify the information
                                against authoritative sources before relying on it.
                            </span>
                        </div>
                    )}

                    {message.citations && message.citations.length === 0 && (
                        <div className="no-citations">
                            <FileText size={17} />
                            <span>No grounded sources were found in the available corpus.</span>
                        </div>
                    )}

                    {message.citations && message.citations.length > 0 && (
                        <div className="citations-section">
                            <button
                                type="button"
                                className="sources-button"
                                onClick={() => setShowCitations(!showCitations)}
                            >
                                <FileText size={18} />
                                <span>Sources ({message.citations.length})</span>
                                <ChevronDown
                                    size={17}
                                    className={showCitations ? "citation-open" : ""}
                                />
                            </button>

                            {showCitations && (
                                <div className="citation-list">
                                    {message.citations.map((citation, index) => (
                                        <a
                                            key={index}
                                            href={citation.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="citation-item"
                                        >
                                            <div className="citation-number">[{index + 1}]</div>
                                            <div className="citation-details">
                                                <strong>{citation.source}</strong>
                                                <span>{citation.header_path.join(" > ")}</span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
