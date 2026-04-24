"use client";

export default function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  currentUserId,
}) {
  if (conversations.length === 0) {
    return (
      <div style={{
        padding: "1.5rem", textAlign: "center",
        color: "var(--color-neutral-400)", fontSize: "0.875rem",
      }}>
        No conversations yet
      </div>
    );
  }

  // Get participant name (other than current user)
  const getOtherParticipantName = (conv) => {
    const otherParticipant = conv.participants.find(p => p._id !== currentUserId);
    return otherParticipant?.name || "Unknown";
  };

  // Get last message preview
  const getLastMessagePreview = (conv) => {
    if (!conv.lastMessage) return "No messages yet";
    const isFromMe = conv.lastMessage.senderId._id === currentUserId;
    const prefix = isFromMe ? "You: " : "";
    return prefix + conv.lastMessage.content.substring(0, 40);
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: "0",
      overflowY: "auto",
    }}>
      {conversations.map((conv) => (
        <button
          key={conv._id}
          onClick={() => onSelectConversation(conv._id)}
          style={{
            padding: "1rem", border: "none", background: "none",
            borderBottom: "1px solid var(--color-neutral-200)",
            cursor: "pointer", textAlign: "left",
            background: selectedConversationId === conv._id
              ? "var(--color-primary-50)"
              : "#fff",
            borderLeft: selectedConversationId === conv._id
              ? "3px solid var(--color-primary-500)"
              : "3px solid transparent",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (selectedConversationId !== conv._id) {
              e.currentTarget.style.background = "var(--color-neutral-50)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = selectedConversationId === conv._id
              ? "var(--color-primary-50)"
              : "#fff";
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.375rem" }}>
            <p style={{
              margin: 0, fontWeight: "600", fontSize: "0.9375rem",
              color: "var(--color-neutral-900)",
            }}>
              {getOtherParticipantName(conv)}
            </p>

            {conv.unreadCount > 0 && (
              <span style={{
                fontSize: "0.68rem", fontWeight: "700",
                background: "var(--color-primary-500)",
                color: "#fff", padding: "0.2rem 0.4rem",
                borderRadius: "9999px", minWidth: "20px",
                textAlign: "center",
              }}>
                {conv.unreadCount}
              </span>
            )}
          </div>

          <p style={{
            margin: 0, fontSize: "0.8125rem",
            color: "var(--color-neutral-500)",
            overflow: "hidden", textOverflow: "ellipsis",
            whiteSpace: "nowrap", fontWeight: conv.unreadCount > 0 ? "500" : "400",
          }}>
            {getLastMessagePreview(conv)}
          </p>

          {conv.relatedRoomId && (
            <p style={{
              margin: "0.25rem 0 0 0", fontSize: "0.75rem",
              color: "var(--color-primary-500)",
            }}>
              {conv.relatedRoomId.label} • {conv.relatedRoomId.rent
                ? `BDT ${conv.relatedRoomId.rent.toLocaleString()}`
                : ""}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}
