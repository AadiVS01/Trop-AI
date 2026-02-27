"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Mode = "landing" | "chat";

export default function ChatPage() {
  const [mode, setMode] = useState<Mode>("landing");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const history = [...messages];
    const updatedHistory = [...history, userMsg];
    setMessages(updatedHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      const reply = data.reply ?? "Sorry, something went wrong.";
      setMessages([...updatedHistory, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...updatedHistory, { role: "assistant", content: "Error reaching the server." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    if (mode === "landing") setMode("chat");
    send(text);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={s.page}>
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
        textarea:focus { outline: none; }
        button:active { transform: scale(0.95); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
      `}</style>

      <div style={{ ...s.window, ...(mode === "chat" ? s.windowChat : {}) }}>

        {/* Landing Hero */}
        <div style={{
          ...s.hero,
          opacity: mode === "chat" ? 0 : 1,
          maxHeight: mode === "chat" ? 0 : "400px",
          overflow: "hidden",
          transition: "opacity 0.4s ease, max-height 0.5s ease",
          pointerEvents: mode === "chat" ? "none" : "auto",
        }}>
          <div style={s.badge}>AI Assistant</div>
          <h1 style={s.heading}>TROP</h1>
          <p style={s.sub}>Your Shopping &amp; Booking Assistant</p>
          <p style={s.desc}>Ask me anything — outfits, products, bookings, or just a chat.</p>
        </div>

        {/* Chat feed (only visible in chat mode) */}
        {mode === "chat" && (
          <div style={s.feed}>
            {messages.map((m, i) => (
              <div key={i} style={{ ...s.row, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "assistant" && <div style={s.avatar}>T</div>}
                <div style={m.role === "user" ? s.bubbleUser : s.bubbleBot}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ ...s.row, justifyContent: "flex-start" }}>
                <div style={s.avatar}>T</div>
                <div style={s.bubbleBot}><span style={s.typing}>●●●</span></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input area */}
        <div style={{ ...s.inputWrap, ...(mode === "chat" ? s.inputWrapChat : {}) }}>
          <div style={s.inputBox}>
            <textarea
              ref={inputRef}
              style={s.textarea}
              rows={1}
              placeholder={mode === "landing" ? "Ask me anything..." : "Message"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
            />
            <button style={s.sendBtn} onClick={handleSend} disabled={loading || !input.trim()}>
              ↑
            </button>
          </div>
          {mode === "landing" && (
            <p style={s.hint}>Press Enter to start</p>
          )}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0a0a",
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: "1rem",
  },
  window: {
    width: "100%",
    maxWidth: "680px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    transition: "all 0.5s ease",
  },
  windowChat: {
    height: "92vh",
    backgroundColor: "#111",
    borderRadius: "20px",
    border: "1px solid #222",
    alignItems: "stretch",
    overflow: "hidden",
  },
  hero: {
    textAlign: "center",
    padding: "2rem 1rem 2.5rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
  },
  badge: {
    fontSize: "0.7rem",
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#4ade80",
    backgroundColor: "rgba(74,222,128,0.1)",
    padding: "4px 12px",
    borderRadius: "99px",
    border: "1px solid rgba(74,222,128,0.25)",
  },
  heading: {
    fontSize: "clamp(3rem, 10vw, 5.5rem)",
    fontWeight: 700,
    color: "#f5f5f5",
    letterSpacing: "-0.03em",
    lineHeight: 1,
  },
  sub: {
    fontSize: "1.1rem",
    fontWeight: 500,
    color: "#aaa",
  },
  desc: {
    fontSize: "0.88rem",
    color: "#555",
    maxWidth: "380px",
  },
  feed: {
    flex: 1,
    overflowY: "auto",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.9rem",
  },
  row: {
    display: "flex",
    alignItems: "flex-end",
    gap: "0.5rem",
    width: "100%",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    backgroundColor: "#1d4ed8",
    color: "#fff",
    fontSize: "0.7rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bubbleUser: {
    backgroundColor: "#2563eb",
    color: "#fff",
    padding: "0.65rem 1rem",
    borderRadius: "18px 18px 4px 18px",
    maxWidth: "72%",
    fontSize: "0.92rem",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
  bubbleBot: {
    backgroundColor: "#1d1d1d",
    color: "#e5e5e5",
    padding: "0.65rem 1rem",
    borderRadius: "18px 18px 18px 4px",
    maxWidth: "76%",
    fontSize: "0.92rem",
    lineHeight: 1.6,
    border: "1px solid #2a2a2a",
    whiteSpace: "pre-wrap",
  },
  typing: {
    color: "#555",
    letterSpacing: "0.2em",
    fontSize: "0.7rem",
  },
  inputWrap: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0 0 0.5rem",
    transition: "padding 0.3s ease",
  },
  inputWrapChat: {
    padding: "0.75rem",
    borderTop: "1px solid #1f1f1f",
  },
  inputBox: {
    display: "flex",
    alignItems: "flex-end",
    gap: "0.5rem",
    width: "100%",
    backgroundColor: "#161616",
    border: "1px solid #2a2a2a",
    borderRadius: "14px",
    padding: "0.5rem 0.5rem 0.5rem 0.9rem",
  },
  textarea: {
    flex: 1,
    resize: "none",
    backgroundColor: "transparent",
    border: "none",
    color: "#e5e5e5",
    fontSize: "0.93rem",
    lineHeight: 1.6,
    fontFamily: "inherit",
    padding: "0.2rem 0",
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: "10px",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontSize: "1.1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "opacity 0.2s",
  },
  hint: {
    fontSize: "0.75rem",
    color: "#3a3a3a",
  },
};
