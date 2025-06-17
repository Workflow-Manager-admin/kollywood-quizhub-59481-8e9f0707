import React from "react";

/**
 * Admin/trainer Quiz management (stateless in this version, just preview quiz types and questions).
 */

const QUIZ_TYPES = [
  {
    type: "timeline",
    title: "Movie Timeline",
    description: "Guess the release year for Kollywood movies. See if you can order Tamil films on a timeline. Actual year is revealed after your guess; challenge your memory!",
  },
  {
    type: "guess",
    title: "Guess the Movie",
    description: "Show a blurred Tamil movie poster, and guess the right movie.",
  },
  {
    type: "character",
    title: "Movie Character Match",
    description: "Given the name of a Kollywood character, pick which movie they belong to.",
  },
  {
    type: "desc",
    title: "Movie Description Challenge",
    description: "Guess the movie name just by reading its short description.",
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
