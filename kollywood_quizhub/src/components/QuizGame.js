import React, { useEffect, useState, useCallback } from "react";
import { useKollywoodMovies, getMovieDetails } from "../tmdbApi";

/**
 * QuizGame component – handles quiz orchestration, state, and UI.
 * Supports multiple quiz types (facts, guess-the-movie) using TMDB data.
 *
 * props: config { type: string, numQuestions: number }
 *        user
 *        onFinish(result, quizState)
 *        onCancel
 */

function shuffle(a) {
  // Fisher-Yates shuffle (in place)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Helper to generate quiz questions (async) based on quiz type and TMDB
async function generateQuestions({ type, numQuestions }) {
  // Fetch a page of popular Tamil movies
  let moviesPage = 1, questions = [];
  while (questions.length < numQuestions && moviesPage <= 3) {
    // Fetch more as needed
    let moviesRes;
    try {
      moviesRes = await fetchPopularKollywood(moviesPage++);
    } catch (e) {
      return [];
    }
    let movies = moviesRes.results || [];
    movies = movies.filter(m => m.title && m.overview);

    for (let movie of shuffle([...movies])) {
      if (questions.length >= numQuestions) break;
      // Prepare different question types
      if (type === "facts") {
        questions.push({
          kind: "facts",
          q: `In which YEAR was "${movie.title}" released?`,
          opts: genYearChoices(movie.release_date),
          answer: (movie.release_date || "").slice(0, 4),
          movie
        });
      } else if (type === "guess") {
        questions.push({
          kind: "guess",
          q: "Guess the movie from this Tamil poster!",
          poster: movie.poster_path,
          opts: genTitleChoices(movie.title, movies),
          answer: movie.title,
          movie
        });
      }
    }
  }
  return questions.slice(0, numQuestions);
}

// Fetch Kollywood movies (page) wrapper
function fetchPopularKollywood(page) {
  // Don't use search, just discover!
  return fetch(`https://api.themoviedb.org/3/discover/movie?api_key=5bc67d3b06aecbd18121a3cbbc16eb59&sort_by=popularity.desc&with_original_language=ta&page=${page}`)
    .then(r => r.json());
}

// Generate multi-choice options for release year
function genYearChoices(yearString) {
  const real = (yearString || "2001").slice(0, 4);
  let y = Number(real);
  if (!y) y = 2001;
  // Random plausible wrong answers
  const opts = [y, y - 1, y + 1, y - 2];
  return shuffle(opts.map(String));
}

// Generate multi-choice options for movie title (quiz)
function genTitleChoices(title, movieList) {
  let others = shuffle(movieList.filter(m => m.title !== title)).slice(0, 3).map(m => m.title);
  let opts = shuffle([title, ...others]);
  return opts;
}

// PUBLIC_INTERFACE
export function QuizGame({ config, user, onFinish, onCancel }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // array of {answer, correct, question}
  const [selected, setSelected] = useState(""); // user's current choice
  const [showCorrect, setShowCorrect] = useState(false);

  // On mount: build questions from API
  useEffect(() => {
    setLoading(true);
    generateQuestions({
      type: config.type, numQuestions: config.numQuestions
    }).then(qs => {
      setQuestions(qs);
      setLoading(false);
    });
  }, [config]);

  // When question changes, reset choice
  useEffect(() => {
    setSelected("");
    setShowCorrect(false);
  }, [currentIndex]);

  // Handle answer selection and navigation
  const submitAnswer = () => {
    const q = questions[currentIndex];
    if (!selected) return;
    const isCorrect = selected === q.answer;
    setAnswers([
      ...answers,
      {
        question: q,
        userAnswer: selected,
        correct: isCorrect,
      }
    ]);
    setShowCorrect(true);
    setTimeout(() => {
      if (currentIndex === questions.length - 1) {
        const score = answers.concat([{ correct: isCorrect }]).filter(a => a.correct).length;
        // Pass all results to parent for stats
        onFinish(
          {
            score,
            max: questions.length,
            answers: [...answers, { question: q, userAnswer: selected, correct: isCorrect }]
          },
          { questions }
        );
      } else {
        setCurrentIndex(i => i + 1);
      }
      setShowCorrect(false);
    }, 900);
  };

  // Early cancel
  if (loading) {
    return <div className="hero" style={{ gap: 28 }}><span className="subtitle">Loading quiz...</span></div>;
  }
  if (!questions.length) {
    return (
      <div className="hero" style={{ gap: 28 }}>
        <span className="subtitle" style={{ color: "var(--secondary)" }}>Failed to load questions.<br />Please try again later.</span>
        <button className="btn btn-large" style={{ background: "var(--secondary)" }} onClick={onCancel}>Back</button>
      </div>
    );
  }

  const q = questions[currentIndex];

  return (
    <div className="hero" style={{ gap: 20, width: "100%" }}>
      <div className="subtitle" style={{ marginBottom: 2, color: "var(--secondary)" }}>
        Question <b>{currentIndex + 1} / {questions.length}</b>
      </div>
      <h2 className="title" style={{
        color: "var(--accent)",
        fontSize: "1.5rem",
        marginBottom: q.kind === "guess" && q.poster ? 2 : 8,
        letterSpacing: "-0.7px"
      }}>{q.q}</h2>
      {q.kind === "guess" && q.poster &&
        <img
          src={`https://image.tmdb.org/t/p/w400${q.poster}`}
          alt="Movie poster"
          style={{
            maxHeight: 250,
            borderRadius: 13,
            outline: "2.8px solid var(--secondary)",
            boxShadow: "0 8px 40px -10px #ff059755",
            marginBottom: 8
          }}
        />
      }
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 13,
        marginBottom: 10,
        alignItems: "center",
        width: "100%",
        maxWidth: 420
      }}>
        {q.opts.map(opt => {
          const answered = showCorrect || answers[currentIndex];
          let bg = "#f4f6fa";
          let color = "var(--accent)";
          let border = "1.6px solid #c7c7d0";
          if (answered) {
            if (opt === q.answer) {
              bg = "#dafae2";
              color = "var(--success)";
              border = "2px solid #17a856";
            }
            else if (opt === selected) {
              bg = "#ffe3ef";
              color = "var(--secondary)";
              border = "2px solid var(--secondary)";
            }
          } else if (opt === selected) {
            bg = "var(--secondary)";
            color = "#fff";
            border = "2.2px solid var(--secondary)";
          }
          return (
            <button
              className="btn"
              key={opt}
              tabIndex={0}
              onClick={() => setSelected(opt)}
              disabled={showCorrect || !!answers[currentIndex]}
              style={{
                minWidth: 190,
                background: bg,
                color,
                border,
                marginBottom: 2,
                fontWeight: 530,
                letterSpacing: 0,
                fontSize: "1.1rem",
                boxShadow: bg === "var(--secondary)" ? "0 4px 16px -7px #ff05977b" : "none"
              }}
            >{opt}</button>
          );
        })}
      </div>
      {!answers[currentIndex] && (
        <button
          className="btn btn-large"
          style={{
            background: selected ? "var(--secondary)" : "#eee",
            color: selected ? "#fff" : "var(--text-gray)",
            marginTop: 10,
            minWidth: 115
          }}
          disabled={!selected}
          onClick={submitAnswer}
        >
          {currentIndex === questions.length - 1 ? "Finish" : "Next →"}
        </button>
      )}
      <button className="btn"
        onClick={onCancel}
        style={{
          background: "var(--accent)",
          color: "#fff",
          marginTop: 12,
          minWidth: 96
        }}>
        Cancel
      </button>
    </div>
  );
}
