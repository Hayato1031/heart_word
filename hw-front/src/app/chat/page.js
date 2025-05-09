"use client";
import { useState, useRef, useEffect } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const [isWsOpen, setIsWsOpen] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const ws = new window.WebSocket('ws://localhost:4567/ws');
    wsRef.current = ws;
    ws.onopen = () => setIsWsOpen(true);
    ws.onclose = () => setIsWsOpen(false);
    return () => ws.close();
  }, []);

  const handleSend = (e) => {
    e.preventDefault();
    if (wsRef.current && isWsOpen) {
      wsRef.current.send(input);
    } else {
      alert("WebSocket接続中です。少し待ってから再度送信してください。");
    }
    if (input !== "") {
      setMessages(msgs => [...msgs, { text: input, from: "user" }]);
    }
    setInput("");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#222",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif"
    }}>
      <div style={{
        background: "#222",
        border: "2px solid #4caf50",
        borderRadius: 16,
        width: "100%",
        maxWidth: 480,
        minHeight: 480,
        height: 480,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 24px #0008",
        overflow: 'hidden',
      }}>
        <div style={{
          flex: 1,
          overflowY: "hidden",
          padding: 24,
          color: "#fff",
          background: "linear-gradient(120deg, #222 80%, #4caf50 100%)",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16
        }}>
          {messages.length === 0 && (
            <div style={{ color: "#aaa", textAlign: "center", marginTop: 80 }}>
              チャットを始めましょう
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{
              margin: "12px 0",
              display: "flex",
              justifyContent: msg.from === "user" ? "flex-end" : "flex-start"
            }}>
              <div style={{
                background: msg.from === "user" ? "#4caf50" : "#333",
                color: msg.from === "user" ? "#fff" : "#fff",
                padding: "10px 16px",
                borderRadius: 16,
                maxWidth: "70%",
                wordBreak: "break-word",
                boxShadow: msg.from === "user" ? "0 2px 8px #4caf5055" : "0 2px 8px #0005",
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} style={{
          display: "flex",
          borderTop: "1px solid #333",
          background: "#222",
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16
        }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isWsOpen ? "メッセージを入力..." : "WebSocket接続中..."}
            style={{
              flex: 1,
              padding: 16,
              border: "none",
              outline: "none",
              background: "#222",
              color: "#fff",
              fontSize: 16,
              borderBottomLeftRadius: 16
            }}
            disabled={!isWsOpen}
          />
          <button type="submit" style={{
            background: "#4caf50",
            color: "#fff",
            border: "none",
            padding: "0 24px",
            fontSize: 16,
            borderBottomRightRadius: 16,
            cursor: isWsOpen ? "pointer" : "not-allowed",
            transition: "background 0.2s"
          }} disabled={!isWsOpen}>
            送信
          </button>
        </form>
      </div>
    </div>
  );
} 