import React, { useState } from "react";

/**
 * Quiz game types offered.
 * Game modes:
 *  - Movie Timeline: Guess the release year
 *  - Guess the Movie: Poster/Clue based
 *  - Movie Character Match: Given a character name, pick/type the correct movie title
 *  - Movie Description Challenge: Identify a movie from its description
 */
const QUIZ_TYPES = [
  {
    type: "timeline",
    title: "Movie Timeline",
    description: "Guess the release year of Kollywood movies. The answer is revealed only after your guess!",
    accent: "#ff0597"
  },
  {
    type: "guess",
    title: "Guess the Movie",
    description: "See a poster (blurred!) and guess the Kollywood movie.",
    accent: "#0a0003"
  },
  {
    type: "character",
    title: "Movie Character Match",
    description: "Given a movie character's name (from Kollywood), select the correct movie title.",
    accent: "#23b925"
  },
  {
    type: "desc",
    title: "Movie Description Challenge",
    description: "Read a short description—guess the right movie name!",
    accent: "#ad23b9"
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
      <div className="hero" style={{ marginBottom: 24 }}>
        <div className="subtitle" style={{ fontWeight: 590 }}>
          <span role="img" aria-label="popcorn" style={{ marginRight: 4 }}>🍿</span>
          Welcome, {user?.name || ""}! Select your Kollywood movie quiz type:
        </div>
        <h2 className="title" style={{ fontSize: "2.1rem", color: "var(--accent)", marginBottom: "0.3em" }}>
          Choose Your Challenge
        </h2>
      </div>
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 30,
        marginBottom: 22
      }}>
        {QUIZ_TYPES.map((qt) => (
          <div
            key={qt.type}
            className={"quiz-card" + (selectedType === qt.type ? " selected" : "")}
            tabIndex={0}
            aria-label={qt.title}
            style={{
              border: `2.3px solid ${selectedType === qt.type ? "var(--secondary)" : qt.accent}`,
              minWidth: 210,
              cursor: "pointer",
              alignItems: "start",
              userSelect: "none",
              outline: "none",
              boxShadow: selectedType === qt.type ? "0 5px 32px -6px #ff059755" : "0 2px 10px 0 rgba(0,0,0,0.11)"
            }}
            onClick={() => setSelectedType(qt.type)}
            onKeyDown={e => (e.key === "Enter" || e.key === " ") && setSelectedType(qt.type)}
          >
            <div style={{
              color: qt.accent,
              fontWeight: 660,
              fontSize: "1.14rem",
              marginBottom: 12,
              letterSpacing: 0
            }}>
              {qt.title}
            </div>
            <div style={{ color: "var(--text-gray)", minHeight: 55, marginBottom: 10 }}>
              {qt.description}
            </div>
            <div style={{ marginTop: 7 }}>
              <input
                type="radio"
                name="quiz-type"
                checked={selectedType === qt.type}
                onChange={() => setSelectedType(qt.type)}
                style={{ marginRight: 3 }}
                tabIndex={-1}
              /> Select
            </div>
          </div>
        ))}
      </div>
      <div style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 16,
        alignItems: "center",
        marginTop: 20
      }}>
        <label htmlFor="question-num" style={{ color: "var(--text-gray)", fontSize: "1.12rem" }}>Number of Questions:</label>
        <input
          id="question-num"
          className="input"
          type="number"
          min="3"
          max="10"
          value={numQuestions}
          onChange={e => {
            if (e.target.value >= 3 && e.target.value <= 10) setNumQuestions(e.target.value);
          }}
          style={{
            width: 62
          }}
        />
        <button
          className="btn btn-large"
          style={{ marginLeft: 20, background: "var(--secondary)" }}
          onClick={handleStart}
        >
          Start Quiz
        </button>
      </div>
    </div>
  );
}
