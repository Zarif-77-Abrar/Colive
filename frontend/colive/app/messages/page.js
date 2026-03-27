"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import ConversationList from "../../components/ConversationList";
import MessageThread from "../../components/MessageThread";
import MessageInput from "../../components/MessageInput";
import { getUser, conversationAPI } from "../../lib/api";

const POLLING_INTERVAL = 3000; // 3 seconds

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [error, setError] = useState("");
  const pollingRef = useRef(null);

  // Get conversationId from query params if provided
  const conversationIdFromParams = searchParams.get("conversationId");

  // Initialize user and load conversations
  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  // Fetch conversations on mount
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        const data = await conversationAPI.getAll();
        setConversations(data.conversations || []);

        // Auto-select conversation from query param or first conversation
        if (conversationIdFromParams) {
          setSelectedConversationId(conversationIdFromParams);
        } else if (data.conversations?.length > 0 && !selectedConversationId) {
          setSelectedConversationId(data.conversations[0]._id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user, conversationIdFromParams]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversationId) return;

    const fetchMessages = async () => {
      try {
        setLoadingMessage(true);
        const data = await conversationAPI.getById(selectedConversationId);
        setMessages(data.messages || []);
        setError("");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingMessage(false);
      }
    };

    fetchMessages();
  }, [selectedConversationId]);

  // Polling for new messages
  useEffect(() => {
    if (!selectedConversationId) return;

    const startPolling = async () => {
      pollingRef.current = setInterval(async () => {
        try {
          const data = await conversationAPI.getById(selectedConversationId);
          setMessages(data.messages || []);
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, POLLING_INTERVAL);
    };

    startPolling();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedConversationId]);

  const handleSendMessage = async (content) => {
    if (!selectedConversationId || !content.trim()) return;

    try {
      setLoadingMessage(true);
      await conversationAPI.sendMessage(selectedConversationId, content);

      // Fetch updated messages immediately
      const data = await conversationAPI.getById(selectedConversationId);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMessage(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "1rem" }}>
        {/* Back link */}
        {user && (
          <Link href={
            user.role === "tenant" ? "/tenant/dashboard" :
            user.role === "owner" ? "/owner/dashboard" :
            "/admin/dashboard"
          } style={{
            fontSize: "0.875rem", color: "var(--color-neutral-500)",
            textDecoration: "none", display: "inline-flex",
            alignItems: "center", gap: "0.375rem", marginBottom: "1rem",
          }}>
            ← Back to dashboard
          </Link>
        )}

        {/* Main messages container */}
        <div style={{
          display: "grid", gridTemplateColumns: "350px 1fr",
          gap: "1rem", height: "calc(100vh - 200px)",
          borderRadius: "var(--radius-lg)", overflow: "hidden",
          background: "#fff",
          border: "1px solid var(--color-neutral-200)",
        }}>
          {/* Conversations sidebar */}
          <div style={{
            borderRight: "1px solid var(--color-neutral-200)",
            display: "flex", flexDirection: "column",
            background: "#fff",
          }}>
            <div style={{
              padding: "1rem", borderBottom: "1px solid var(--color-neutral-200)",
            }}>
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "600" }}>
                Messages
              </h3>
              <p style={{
                margin: "0.25rem 0 0 0", fontSize: "0.8125rem",
                color: "var(--color-neutral-500)",
              }}>
                {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
              </p>
            </div>

            {loading ? (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                flexGrow: 1, color: "var(--color-neutral-400)",
              }}>
                Loading...
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                selectedConversationId={selectedConversationId}
                onSelectConversation={setSelectedConversationId}
                currentUserId={user?._id}
              />
            )}
          </div>

          {/* Messages area */}
          <div style={{
            display: "flex", flexDirection: "column",
            background: "#fff",
          }}>
            {selectedConversationId ? (
              <>
                {/* Messages header */}
                {selectedConversationId && conversations.length > 0 && (
                  <div style={{
                    padding: "1rem", borderBottom: "1px solid var(--color-neutral-200)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      {(() => {
                        const conv = conversations.find(c => c._id === selectedConversationId);
                        const otherUser = conv?.participants.find(p => p._id !== user?._id);
                        return (
                          <>
                            <p style={{ margin: 0, fontWeight: "600", fontSize: "1rem" }}>
                              {otherUser?.name || "Unknown"}
                            </p>
                            {conv?.relatedRoomId && (
                              <p style={{
                                margin: "0.25rem 0 0 0", fontSize: "0.8125rem",
                                color: "var(--color-neutral-500)",
                              }}>
                                {conv.relatedRoomId.label}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Error state */}
                {error && (
                  <div style={{
                    margin: "1rem", padding: "0.75rem",
                    background: "var(--color-error-50)", border: "1px solid var(--color-error-500)",
                    borderRadius: "var(--radius-md)", color: "var(--color-error-700)",
                    fontSize: "0.875rem",
                  }}>
                    {error}
                  </div>
                )}

                {/* Messages thread */}
                <MessageThread
                  messages={messages}
                  currentUserId={user?._id}
                  isLoading={loadingMessage}
                />

                {/* Message input */}
                <MessageInput
                  onSend={handleSendMessage}
                  disabled={!selectedConversationId}
                  isLoading={loadingMessage}
                />
              </>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                flexGrow: 1, color: "var(--color-neutral-400)",
                flexDirection: "column", gap: "0.75rem",
              }}>
                <p style={{ fontSize: "1rem", fontWeight: "500" }}>Select a conversation</p>
                <p style={{ fontSize: "0.875rem" }}>to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
