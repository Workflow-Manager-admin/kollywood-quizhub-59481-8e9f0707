import React from "react";

/**
 * Admin/trainer Quiz management (stateless in this version, just preview quiz types and questions).
 */

const QUIZ_TYPES = [
  {
    type: "facts",
    title: "Kollywood Movie Facts",
    description: "Automatic questions about Kollywood (year, actor, hit movies) generated from TheMovieDB.",
  },
  {
    type: "guess",
    title: "Guess the Movie",
    description: "Show a Tamil movie poster, and guess the right movie.",
  }
];

// PUBLIC_INTERFACE
export function QuizManager({ onBack }) {
  return (
    <div className="hero">
      <span className="subtitle">Quiz Management</span>
      <h2 className="title" style={{ color: "#0a0003", fontSize: "2rem" }}>Current Quiz Types</h2>
      <div style={{
        display: "flex",
        gap: 22,
        justifyContent: "center",
        marginTop: 26,
        flexWrap: "wrap"
      }}>
        {QUIZ_TYPES.map(qt => (
          <div key={qt.type} className="quiz-card" style={{
            width: 260,
            border: "2px solid var(--secondary)",
            boxShadow: "0 2px 16px -9px #ff059735",
            margin: 6,
            color: "var(--accent)"
          }}>
            <b style={{ color: "var(--secondary)" }}>{qt.title}</b>
            <div style={{ marginTop: 9, color: "#6f507e" }}>{qt.description}</div>
          </div>
        ))}
      </div>
      <button className="btn btn-large" style={{ background: "var(--secondary)", marginTop: 26 }} onClick={onBack}>
        Back to Game
      </button>
    </div>
  );
}
