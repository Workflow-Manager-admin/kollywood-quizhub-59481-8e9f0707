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
        marginTop: 30,
        flexWrap: "wrap"
      }}>
        {QUIZ_TYPES.map(qt => (
          <div key={qt.type} style={{
            background: "#fff",
            color: "#0a0003",
            border: "2px solid #ff0597",
            borderRadius: 8,
            padding: "22px 16px",
            width: 280,
            margin: 6
          }}>
            <b>{qt.title}</b>
            <div style={{ marginTop: 10 }}>{qt.description}</div>
          </div>
        ))}
      </div>
      <button className="btn btn-large" style={{ background: "#ff0597", marginTop: 26 }} onClick={onBack}>
        Back to Game
      </button>
    </div>
  );
}
