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
    let echo = 100;
    let corrosion = 1;
    if (typeof window !== 'undefined') {
      const storedEcho = Number(localStorage.getItem('echo'));
      const storedCorrosion = Number(localStorage.getItem('corrosion'));
      if (!isNaN(storedEcho)) echo = storedEcho;
      if (!isNaN(storedCorrosion)) corrosion = storedCorrosion;
    }
    if (wsRef.current && isWsOpen) {
      wsRef.current.send(JSON.stringify({
        message: input,
        echo,
        corrosion,
        fromClient: true
      }));
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
        background: "rgba(34,34,34,0.96)",
        border: "1.5px solid #4caf50",
        borderRadius: 18,
        width: "100%",
        maxWidth: 540,
        minHeight: 540,
        height: 540,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 24px #000a",
        overflow: 'hidden',
        margin: 24,
      }}>
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: 28,
          color: "#fff",
          background: "#222",
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {messages.length === 0 && (
            <div style={{ color: "#aaa", textAlign: "center", marginTop: 80 }}>
              Start the conversation
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
              width: '100%',
            }}>
              <div style={{
                background: msg.from === "user" ? "#4caf50" : "#292929",
                color: msg.from === "user" ? "#fff" : "#fff",
                padding: "12px 18px",
                borderRadius: msg.from === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                maxWidth: "80%",
                minWidth: 36,
                wordBreak: "break-word",
                boxShadow: msg.from === "user" ? "0 2px 8px #4caf5055" : "0 2px 8px #0005",
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
                fontSize: msg.from === 'ai' ? 20 : 18,
                lineHeight: 1.6,
                margin: msg.from === 'user' ? '0 0 0 32px' : '0 32px 0 0',
                border: msg.from === 'ai' ? '1.2px solid #4caf50' : undefined,
                transition: 'background 0.2s',
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
          background: "rgba(34,34,34,0.98)",
          borderBottomLeftRadius: 18,
          borderBottomRightRadius: 18,
          padding: '18px 18px 18px 18px',
          gap: 12,
        }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isWsOpen ? "Type a message..." : "Connecting to WebSocket..."}
            style={{
              flex: 1,
              padding: 14,
              border: "1.2px solid #4caf50",
              outline: "none",
              background: "#232",
              color: "#fff",
              fontSize: 18,
              borderRadius: 12,
              boxShadow: '0 1px 4px #0005',
              transition: 'border 0.2s',
            }}
            disabled={!isWsOpen}
          />
          <button type="submit" style={{
            background: isWsOpen ? "#4caf50" : "#444",
            color: "#fff",
            border: "none",
            padding: "0 32px",
            fontSize: 18,
            borderRadius: 12,
            cursor: isWsOpen ? "pointer" : "not-allowed",
            transition: "background 0.2s, color 0.2s"
          }} disabled={!isWsOpen}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
} 