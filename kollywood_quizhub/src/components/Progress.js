import React from "react";

/**
 * Progress/Results for completed quiz
 */

// PUBLIC_INTERFACE
export function Progress({ result, user, onRestart, quizState }) {
  const { score, max, answers } = result || {};
  return (
    <div className="hero">
      <span className="subtitle">
        Well done, {user?.name || "player"}!
      </span>
      <h2 className="title" style={{ color: "#0a0003", fontSize: "2.2rem" }}>
        Your Score: <span style={{ color: "#ff0597" }}>{score} / {max}</span>
      </h2>
      <div style={{
        background: "#fff",
        color: "#0a0003",
        borderRadius: 9,
        padding: "14px 27px",
        marginTop: 24,
        marginBottom: 14,
        boxShadow: "0 3px 20px -8px #0a00033c",
        width: "100%",
        maxWidth: 450,
      }}>
        <b>Answers:</b>
        <ol style={{ paddingLeft: 22 }}>
          {answers && answers.map((a, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              <span>{a.question.q.replace(/"([^"]+)"/g, <b>&quot;$1&quot;</b>)} </span>
              <br />
              <span>
                <b>Your answer:</b> {a.userAnswer}
                <span style={{ marginLeft: 8, fontWeight: 600, color: a.correct ? "#23b925" : "#ff0597" }}>
                  {a.correct ? "✓" : "✕"}
                </span>
                {a.userAnswer !== a.question.answer &&
                  <span style={{ marginLeft: 10, color: "#000" }}>
                    (Correct: <span style={{ color: "#23b925" }}>{a.question.answer}</span>)
                  </span>
                }
              </span>
            </li>
          ))}
        </ol>
      </div>
      <button className="btn btn-large" style={{ background: "#ff0597" }} onClick={onRestart}>
        Play Again
      </button>
    </div>
  );
}
