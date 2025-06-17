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
    return <div className="hero"><span>Loading quiz...</span></div>;
  }
  if (!questions.length) {
    return (
      <div className="hero">
        <span>Failed to load questions. Please try again later.</span>
        <button className="btn" onClick={onCancel}>Back</button>
      </div>
    );
  }

  const q = questions[currentIndex];

  return (
    <div className="hero" style={{ gap: 14 }}>
      <div className="subtitle">Question {currentIndex + 1} / {questions.length}</div>
      <h2 className="title" style={{ color: "#0a0003", fontSize: "2rem" }}>{q.q}</h2>
      {q.kind === "guess" && q.poster &&
        <img src={`https://image.tmdb.org/t/p/w400${q.poster}`}
             alt="Movie poster"
             style={{
               maxHeight: 300,
               borderRadius: 10,
               outline: "2.5px solid #ff0597",
               boxShadow: "0 6px 30px -8px #0a00033f",
               marginBottom: 12
             }}
        />
      }
      <div style={{ display: "flex", flexDirection: "column", gap: 15, marginBottom: 9, alignItems: "center" }}>
        {q.opts.map(opt => {
          const answered = showCorrect || answers[currentIndex];
          let bg = "#f4f6fa";
          if (answered) {
            if (opt === q.answer) bg = "#79ef90";
            else if (opt === selected) bg = "#ff7f9e";
          } else if (opt === selected) bg = "#ff0597";
          return (
            <button
              className="btn"
              key={opt}
              onClick={() => setSelected(opt)}
              disabled={showCorrect || !!answers[currentIndex]}
              style={{
                minWidth: 190,
                background: bg,
                color: bg === "#ff0597" ? "white" : "#0a0003",
                border: bg === "#ff0597" ? "none" : "1.4px solid #0a0003",
                marginBottom: 4,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >{opt}</button>
          );
        })}
      </div>
      {!answers[currentIndex] && (
        <button
          className="btn btn-large"
          style={{ background: "#ff0597", marginTop: 16 }}
          disabled={!selected}
          onClick={submitAnswer}
        >
          {currentIndex === questions.length - 1 ? "Finish" : "Next"}
        </button>
      )}
      <button className="btn" onClick={onCancel}
        style={{ background: "#0a0003", marginTop: 16 }}>
        Cancel
      </button>
    </div>
  );
}
