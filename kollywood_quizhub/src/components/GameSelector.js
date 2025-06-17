import React, { useState } from "react";

/**
 * Quiz game types offered.
 * For this version, two types are implemented:
 *  - Movie Facts (General Kollywood Questions)
 *  - Guess the Movie (Poster/Clue based)
 */
const QUIZ_TYPES = [
  {
    type: "facts",
    title: "Kollywood Movie Facts",
    description: "Answer general questions about Tamil cinema: actors, years, blockbusters.",
    accent: "#ff0597"
  },
  {
    type: "guess",
    title: "Guess the Movie",
    description: "See a poster or clue, and guess the Kollywood movie!",
    accent: "#0a0003"
  }
];

// PUBLIC_INTERFACE
export function GameSelector({ startQuiz, user }) {
  const [selectedType, setSelectedType] = useState(QUIZ_TYPES[0].type);
  const [numQuestions, setNumQuestions] = useState(5);

  function handleStart() {
    startQuiz({ type: selectedType, numQuestions: Number(numQuestions) });
  }

  return (
    <div>
      <div className="hero" style={{ marginBottom: 36 }}>
        <div className="subtitle">Welcome, {user?.name || ""}! Select your Kollywood movie quiz type:</div>
        <h2 className="title" style={{ fontSize: "2.3rem", color: "#0a0003" }}>Choose Your Challenge</h2>
      </div>
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: 40
      }}>
        {QUIZ_TYPES.map((qt) => (
          <div
            key={qt.type}
            className="quiz-card"
            style={{
              background: "#fff",
              border: `2.5px solid ${qt.accent}`,
              borderRadius: 11,
              padding: 24,
              boxShadow: "0 2.5px 10px 0 rgba(0,0,0,0.07)",
              minWidth: 240,
              cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "start",
              transition: "box-shadow 0.2s, border 0.2s",
              ...(selectedType === qt.type ? { boxShadow: "0 2px 26px #ff05976c", border: "2.5px solid #ff0597" } : {})
            }}
            onClick={() => setSelectedType(qt.type)}
          >
            <div style={{ color: qt.accent, fontWeight: 600, marginBottom: 10 }}>
              {qt.title}
            </div>
            <div style={{ color: "#676767", minHeight: 60 }}>{qt.description}</div>
            <input
              type="radio"
              name="quiz-type"
              style={{ marginTop: 10 }}
              checked={selectedType === qt.type}
              onChange={() => setSelectedType(qt.type)}
            />
          </div>
        ))}
      </div>
      <div style={{
        display: "flex", justifyContent: "center", gap: 28, alignItems: "center", marginTop: 34
      }}>
        <label style={{ color: "#676767", fontSize: "1.09rem" }}>Number of Questions:</label>
        <input
          type="number"
          min="3"
          max="10"
          value={numQuestions}
          onChange={e => setNumQuestions(e.target.value)}
          style={{
            padding: "7px 10px",
            border: "1.5px solid #0a0003",
            borderRadius: 4,
            fontSize: "1rem",
            width: 57
          }}
        />
        <button
          className="btn btn-large"
          style={{ marginLeft: 36, background: "#ff0597" }}
          onClick={handleStart}
        >Start Quiz</button>
      </div>
    </div>
  );
}
