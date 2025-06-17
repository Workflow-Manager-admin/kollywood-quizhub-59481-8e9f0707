import React from "react";

/**
 * Progress/Results for completed quiz
 */

export function Progress({ result, user, onRestart, quizState }) {
  const { score, max, answers } = result || {};
  return (
    <div className="hero">
      <span className="subtitle" style={{ fontSize: "1.27rem", marginBottom: 2, color: "var(--secondary)" }}>
        🏆 Well done, <b>{user?.name || "player"}</b>!
      </span>
      <h2 className="title" style={{ color: "var(--accent)", fontSize: "2rem", marginBottom: 8 }}>
        Your Score: <span style={{ color: "var(--secondary)" }}>{score} <small style={{ color: "#bbb" }}>/</small> {max}</span>
      </h2>
      <div
        style={{
          background: "#fff",
          color: "var(--accent)",
          borderRadius: 14,
          padding: "18px 18px 8px 22px",
          marginTop: 18,
          marginBottom: 16,
          boxShadow: "0 3px 18px -8px #ff05973d",
          width: "100%",
          maxWidth: 580,
          textAlign: "left",
          border: "1.5px solid #f3dee6"
        }}>
        <b style={{ color: "var(--secondary)" }}>Quiz Recap:</b>
        <ol style={{ paddingLeft: 21 }}>
          {answers && answers.map((a, i) => (
            <li key={i} style={{ marginBottom: 13, fontWeight: 470, listStyleType: "decimal" }}>
              <div>
                {/* Render intro/question */}
                <span>{
                  a.question.kind === "character"
                    ? <>Movie Character: <b style={{ color: "#23b925" }}>{a.question.character}</b> (Which movie?)</>
                    : typeof a.question.q === "string"
                      ? a.question.q.replace(/"([^"]+)"/g, (m, $1) => <b key={i}>&quot;{$1}&quot;</b>)
                      : a.question.q
                }</span>
              </div>
              {/* Timeline-order: show actual vs yours as lists/rows with years */}
              {a.question.kind === 'timeline-order' ? (
                <div style={{ margin: "2px 0 3px 0", paddingLeft: 7 }}>
                  <div>
                    <span style={{
                      color: a.correct ? "var(--success)" : "var(--secondary)",
                      fontWeight: a.correct ? 650 : 600,
                      marginRight: 4
                    }}>{a.correct ? "✔" : "✖"} Your Order:</span>
                    <ol style={{ margin: "2px 0 6px 17px" }}>
                      {Array.isArray(a.userAnswer) && a.userAnswer.map((mov, idx) => {
                        const year = (
                          (a.question.movies.find(m => m.title === mov) || a.question.answerOrder.find(m => m.title === mov))?.release_date || ""
                        ).slice(0, 4);
                        // Highlight if at correct position
                        const correctMovie = a.question.answerOrder[idx].title;
                        return (
                          <li key={mov + idx} style={{
                            listStyleType: "decimal",
                            color: mov === correctMovie ? "var(--success)" : "#c8194f",
                            fontWeight: mov === correctMovie ? 660 : 530,
                            marginBottom: 1
                          }}>
                            {mov} <span style={{ color: "#899", fontWeight: 420 }}>({year || "?"})</span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                  {!a.correct && (
                    <div>
                      <span style={{
                        marginRight: 4,
                        color: "#ad23b9",
                        fontWeight: 560
                      }}>Correct Order:</span>
                      <ol style={{ margin: "2px 0 10px 17px" }}>
                        {a.question.answerOrder.map((mov, idx) => (
                          <li key={mov.title + idx} style={{
                            listStyleType: "decimal",
                            color: "#1ba84a",
                            fontWeight: 680
                          }}>
                            {mov.title} <span style={{ color: "#899", fontWeight: 420 }}>({mov.release_date.slice(0, 4)})</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <span style={{
                    color: a.correct ? "var(--success)" : "var(--secondary)",
                    fontWeight: a.correct ? 650 : 600
                  }}>
                    {a.correct ? "✔" : "✖"}&nbsp;
                  </span>
                  <span>
                    <b>Your answer:</b> <span style={{
                      color: a.correct ? "var(--success)" : "var(--secondary)"
                    }}>{a.userAnswer}</span>
                    {a.userAnswer !== a.question.answer &&
                      <span style={{ marginLeft: 10, color: "#a90a25", fontWeight: 520 }}>
                        (Correct: <b style={{ color: "var(--success)" }}>{a.question.answer}</b>)
                      </span>
                    }
                  </span>
                </>
              )}
            </li>
          ))}
        </ol>
      </div>
      <button className="btn btn-large" style={{ background: "var(--secondary)" }} onClick={onRestart}>
        Play Again
      </button>
    </div>
  );
}
