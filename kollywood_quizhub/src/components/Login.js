import React, { useState } from "react";

/**
 * Login UI for Kollywood QuizHub
 * Simple no-backend login (just sets a username for the session)
 */

// PUBLIC_INTERFACE
export function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (username.trim() === "") return setSubmitted(true);
    onLogin({ name: username.trim() });
  };

  return (
    <div className="hero" style={{ marginTop: 8, width: "100%" }}>
      <div className="subtitle" style={{fontWeight: 650, letterSpacing: "-.5px"}}>🎬 Ready for the Ultimate Kollywood Movie Quiz?</div>
      <h1 className="title" style={{ color: "var(--accent)" }}>Kollywood QuizHub</h1>
      <div className="description">
        Login to challenge yourself on Tamil cinema – from superstars to cult classics!
      </div>
      <form onSubmit={submit} className="card"
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, minWidth: 260, maxWidth: 390, marginTop: 12, width: "100%"
        }}>
        <input
          className="input"
          placeholder="Enter your name"
          value={username}
          autoFocus
          onChange={e => { setUsername(e.target.value); setSubmitted(false); }}
          aria-label="Your name"
          maxLength={20}
        />
        <button className="btn btn-large" style={{ width: "100%", background: "var(--secondary)" }}>Login</button>
        {submitted && !username.trim() && (
          <span style={{
            color: "var(--secondary)",
            fontSize: "0.98rem",
            width: "100%",
            textAlign: "center",
            borderTop: "1px dashed #ff059720",
            paddingTop: 8,
            marginTop: 0
          }}>
            Please enter your name to start!
          </span>
        )}
      </form>
    </div>
  );
}
