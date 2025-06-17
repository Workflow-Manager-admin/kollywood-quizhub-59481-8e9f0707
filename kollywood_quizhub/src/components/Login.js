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
    <div className="hero" style={{ marginTop: 24 }}>
      <div className="subtitle">Ready for the Ultimate Kollywood Movie Quiz?</div>
      <h1 className="title" style={{ color: "#0a0003" }}>Kollywood QuizHub</h1>
      <div className="description" style={{ color: "#676767" }}>
        Login to challenge yourself on Tamil cinema – from superstars to cult classics!
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, minWidth: 300 }}>
        <input
          className="input"
          style={{
            padding: "10px 14px",
            border: "1.5px solid #ff0597",
            borderRadius: 5,
            fontSize: "1.05rem",
            width: "100%"
          }}
          placeholder="Enter your name"
          value={username}
          autoFocus
          onChange={e => { setUsername(e.target.value); setSubmitted(false); }}
        />
        <button className="btn btn-large" style={{ width: "100%", background: "#ff0597" }}>Login</button>
        {submitted && !username.trim() && (
          <span style={{ color: "#ff0597", fontSize: "0.95rem" }}>
            Please enter your name to start!
          </span>
        )}
      </form>
    </div>
  );
}
