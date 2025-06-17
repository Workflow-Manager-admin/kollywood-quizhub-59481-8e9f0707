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

/**
 * Helper to generate quiz questions (async) based on quiz type and TMDB
 * Enhanced: Guess the Movie now includes two clues (actor and year as hidden hint).
 */
async function generateQuestions({ type, numQuestions }) {
  // Fetch a page of popular Tamil movies
  let moviesPage = 1, questions = [];

  // Helper: extract main actor name from movie cast, fallback if missing
  async function getMainActor(movieId) {
    try {
      const resp = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=5bc67d3b06aecbd18121a3cbbc16eb59`);
      const data = await resp.json();
      if (data.cast && data.cast.length > 0) {
        const tamilStar = data.cast.find(
          c => ["Vijay", "Ajith Kumar", "Kamal Haasan", "Rajinikanth", "Suriya", "Karthi", "Dhanush", "Vikram"].includes(c.name)
        );
        return (tamilStar ? tamilStar.name : data.cast[0].name) || "Unknown";
      }
    } catch (e) { /* ignore */ }
    return "Unknown";
  }

  // Helper: extract a (likely) named character from a cast list (priority: familiar, then any)
  function extractCharacterName(movieCast) {
    // Use a common Tamil character if present, else pick the first non-empty
    if (!Array.isArray(movieCast) || movieCast.length === 0) return null;
    const knownCharacters = [
      "Vasu", "Anbu", "Durai", "Arjun", "Selvam", "Chandru", "Shankar", "Surya", "Meera", "Vijay", "Rani", "Divya",
      "Perumal", "Raghu", "Chinna", "Saravanan", "Nila", "Anjali", "Raja"
    ];
    // priority: first matching knownCharacters (with enough length), fallback: first decent
    const pref = movieCast.find(
      m => m.character && knownCharacters.includes(m.character) && m.character.length >= 3
    );
    if (pref && pref.character) return pref.character;
    const decent = movieCast.find(m => typeof m.character === "string" && m.character.length >= 3);
    return decent ? decent.character : null;
  }

  while (questions.length < numQuestions && moviesPage <= 5) {
    // Fetch more as needed
    let moviesRes;
    try {
      moviesRes = await fetchPopularKollywood(moviesPage++);
    } catch (e) {
      return [];
    }
    let movies = moviesRes.results || [];
    movies = movies.filter(m => m.title && m.overview && m.poster_path);

    for (let movie of shuffle([...movies])) {
      if (questions.length >= numQuestions) break;

      // Movie Timeline mode: guess the release year
      if (type === "timeline") {
        questions.push({
          kind: "timeline",
          q: `Guess the release year of "${movie.title}"`,
          opts: genYearChoices(movie.release_date),
          answer: (movie.release_date || "").slice(0, 4),
          movie
        });
      }
      // Guess the Movie mode: add actor & year clue
      else if (type === "guess") {
        let actorName = "Kollywood actor";
        try {
          actorName = await getMainActor(movie.id);
        } catch (e) { actorName = "Kollywood actor"; }
        questions.push({
          kind: "guess",
          q: "Guess the movie from this Tamil poster!",
          poster: movie.poster_path,
          opts: genTitleChoices(movie.title, movies),
          answer: movie.title,
          movie,
          clues: {
            actor: actorName,
            year: (movie.release_date || "").slice(0, 4)
          }
        });
      }
      // Movie Character Match mode
      else if (type === "character") {
        // Fetch credits for this movie to obtain character names
        let cast = [], charName = null;
        try {
          const resp = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=5bc67d3b06aecbd18121a3cbbc16eb59`);
          cast = ((await resp.json()).cast || []);
          charName = extractCharacterName(cast);
        } catch (e) {
          charName = null;
        }
        // Fallback if not present, skip if no valid character
        if (!charName || charName.toLowerCase() === "self") continue;
        questions.push({
          kind: "character",
          q: `Which Kollywood movie features the character "${charName}"?`,
          character: charName,
          opts: genTitleChoices(movie.title, movies),
          answer: movie.title,
          movie
        });
      }
      // Deprecated: old "facts" mode (unused)
      else if (type === "facts") {
        questions.push({
          kind: "facts",
          q: `In which YEAR was "${movie.title}" released?`,
          opts: genYearChoices(movie.release_date),
          answer: (movie.release_date || "").slice(0, 4),
          movie
        });
      }
      // Deprecated: old "actor" mode removed
      else if (type === "desc") {
        questions.push({
          kind: "desc",
          q: "Given this movie description, can you guess the movie?",
          clue: movie.overview,
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

/**
 * Generate multi-choice options for movie title (quiz)
 */
function genTitleChoices(title, movieList) {
  let others = shuffle(movieList.filter(m => m.title !== title)).slice(0, 3).map(m => m.title);
  let opts = shuffle([title, ...others]);
  return opts;
}

/**
 * Generate actor options (mock with popular Kollywood names, or sample from movieList)
 */
function genActorChoices(correct, movieList) {
  // Mock names, as no cast data in current API usage.
  const kollyNames = ["Vijay", "Ajith Kumar", "Kamal Haasan", "Rajinikanth", "Suriya", "Karthi", "Dhanush", "Vikram"];
  const others = shuffle(kollyNames.filter(n => n !== correct)).slice(0, 3);
  const opts = shuffle([correct, ...others]);
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

  // Helper for fuzzy string matching (for movie title input)
  function isFuzzyMatch(userAns, correctAns) {
    // Lowercase, remove extra spaces and symbols for naive normalization
    const normalize = s => (s || "").toLowerCase().replace(/[^a-z0-9 ]/gi, "").replace(/\s+/g, " ").trim();
    const normUser = normalize(userAns);
    const normCorrect = normalize(correctAns);

    // Simple check for close match: allow small typos (Levenshtein distance <=2)
    function levenshtein(a, b) {
      if (!a.length) return b.length;
      if (!b.length) return a.length;
      const dp = Array(a.length + 1).fill(null).map(() =>
        Array(b.length + 1).fill(null)
      );
      for (let i = 0; i <= a.length; i++) dp[i][0] = i;
      for (let j = 0; j <= b.length; j++) dp[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + cost
          );
        }
      }
      return dp[a.length][b.length];
    }

    if (normUser === normCorrect) return true;
    if (levenshtein(normUser, normCorrect) <= 2) return true;
    // Accept if user answer contains all words of solution (reordered), for multiword titles
    const correctSet = new Set(normCorrect.split(" "));
    const userSet = new Set(normUser.split(" "));
    if ([...correctSet].filter(w => userSet.has(w)).length >= correctSet.size - 1 && correctSet.size > 1) return true;
    return false;
  }

  // Handle answer selection and navigation
  const submitAnswer = () => {
    const q = questions[currentIndex];

    if (q.kind === "timeline") {
      // Must have a 4-digit number for year
      if (!/^\d{4}$/.test(selected)) return;
    } else if (q.kind === "guess") {
      // Free text, require not-empty and at least 3 chars
      if (!selected || selected.trim().length < 2) return;
    } else {
      if (!selected) return;
    }

    const userInput = selected;
    let isCorrect;
    if (q.kind === "guess") {
      isCorrect = isFuzzyMatch(userInput, q.answer);
    } else {
      isCorrect = userInput === q.answer;
    }

    setAnswers([
      ...answers,
      {
        question: q,
        userAnswer: userInput,
        correct: isCorrect,
      }
    ]);
    setShowCorrect(true);
    setTimeout(() => {
      if (currentIndex === questions.length - 1) {
        const score = answers.concat([{ correct: isCorrect }]).filter(a => a.correct).length;
        onFinish(
          {
            score,
            max: questions.length,
            answers: [...answers, { question: q, userAnswer: userInput, correct: isCorrect }]
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

      {/* Movie Timeline UI (movie name is question, player types year) */}
      {q.kind === "timeline" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "#f4f7fc",
            borderRadius: 11,
            border: "1.7px solid #c3e9c1",
            boxShadow: "0 2px 12px -7px #39afb94a",
            padding: "20px 18px 18px 18px",
            minWidth: 260,
            maxWidth: 410,
            marginBottom: 10,
            marginTop: 8
          }}
        >
          <div style={{
            fontSize: "1.23em",
            fontWeight: 600,
            color: "#169b9b",
            marginBottom: 8,
            letterSpacing: "-0.8px"
          }}>
            <span role="img" aria-label="film">🎬</span> Movie Name:
          </div>
          <div
            style={{
              fontWeight: 680,
              fontSize: "1.35em",
              color: "var(--accent)",
              margin: "0 0 9px 0",
              letterSpacing: "-1px"
            }}
            tabIndex={0}
            aria-label={`Movie title is ${q.movie?.title || "unknown"}`}
          >
            {q.movie?.title || "Movie Title Not Found"}
          </div>
          <span
            style={{
              fontSize: "1.1em",
              color: "#286666",
              fontWeight: 510
            }}
          >
            Type the release year:
          </span>
          <input
            className="input"
            style={{
              marginTop: 8,
              marginBottom: 3,
              width: 110,
              fontSize: "1.18em",
              textAlign: "center"
            }}
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="e.g. 1999"
            maxLength={4}
            value={selected}
            onChange={e => {
              const v = e.target.value.slice(0, 4);
              // Only digits
              if (/^\d{0,4}$/.test(v)) setSelected(v);
            }}
            disabled={showCorrect || !!answers[currentIndex]}
            aria-label="Type movie release year"
            autoFocus
          />
          {(showCorrect || answers[currentIndex]) && (
            <div style={{
              marginTop: 7,
              color: selected === q.answer ? "var(--success)" : "var(--secondary)",
              fontWeight: 650,
              fontSize: "1.09em"
            }}>
              {selected === q.answer
                ? <span>✔ Correct! <span style={{ color: "#23b925" }}>{q.answer}</span></span>
                : <span>✖ Incorrect. <span style={{ marginLeft: 6 }}>Actual year:</span> <b style={{ color: "#23b925" }}>{q.answer}</b></span>
              }
            </div>
          )}
        </div>
      )}

      {q.kind === "guess" && q.poster &&
        <img
          src={`https://image.tmdb.org/t/p/w400${q.poster}`}
          alt="Movie poster"
          style={{
            maxHeight: 250,
            borderRadius: 13,
            outline: "2.8px solid var(--secondary)",
            boxShadow: "0 8px 40px -10px #ff059755",
            marginBottom: 8,
            filter: "blur(8px)"
          }}
        />
      }
      {/* Enhanced Guess the Movie clues */}
      {q.kind === "guess" && q.clues && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "center",
          background: "#fcfcff",
          borderRadius: 9,
          border: "1.2px solid #ecd7f9",
          boxShadow: "0 4px 14px -6px #c5abff2e",
          margin: "0.5em 0 1em 0",
          padding: "13px 18px 11px 18px",
          minWidth: 240,
          maxWidth: 390
        }}>
          <div style={{ fontWeight: 570, color: "#700b8e", marginBottom: 2, fontSize: "1.03em" }}>
            🎭 Clues
          </div>
          {/* Clue 1: Main Actor */}
          <div>
            <span style={{
              fontWeight: 600,
              color: "#23b925",
              marginRight: 4
            }}>Clue 1 (Actor): </span>
            <span style={{
              color: "#0a0030",
              fontWeight: 520
            }}>{q.clues.actor || "Kollywood actor"}</span>
          </div>
          {/* Clue 2: Release Year (initially shown as a "reveal hint" button) */}
          <GuessYearHint year={q.clues.year} alreadyAnswered={!!answers[currentIndex]} />
        </div>
      )}

      {/* Movie Character Match mode UI */}
      {q.kind === "character" && (
        <div style={{
          background: "#f3fff9",
          color: "var(--accent)",
          borderRadius: 8,
          border: "1.7px solid #23b92544",
          boxShadow: "0 2px 10px -4px #23b9251a",
          padding: 14,
          marginBottom: 7
        }}>
          <div style={{
            fontWeight: 580,
            color: "#23b925",
            marginBottom: 5,
            fontSize: "1.08em"
          }}>
            Character Name: <span style={{
              color: "#0a0030",
              fontWeight: 700,
              marginLeft: 4
            }}>{q.character}</span>
          </div>
          <span style={{ color: "#708390" }}>
            Select the correct Kollywood movie that features this character.
          </span>
        </div>
      )}

      {/* Render Movie Description Challenge */}
      {q.kind === "desc" && (
        <div style={{
          background: "#fff9e6",
          color: "var(--accent)",
          borderRadius: 8,
          border: "1.5px solid #ffe99b",
          boxShadow: "0 3px 16px -10px #f5ce61",
          padding: 16,
          marginBottom: 8
        }}>
          <div style={{ fontWeight: 590, marginBottom: 4 }}>
            <span style={{ color: "#ad23b9" }}>Description:</span>
          </div>
          <span style={{ color: "var(--text-gray)" }}>{q.clue}</span>
        </div>
      )}
      {/* Render answer input/controls for Guess the Movie mode (free text), for Character/Description (MCQ), and legacy MCQ if any */}
      {/* Timeline handled above */}
      {q.kind === "guess" ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
            background: "#f5f6ff",
            borderRadius: 8,
            border: "1.4px solid #d5b7fd99",
            boxShadow: "0 2px 13px -7px #ad23b93f",
            padding: "14px 14px 12px 14px",
            minWidth: 235,
            maxWidth: 410,
            width: "100%"
          }}
        >
          <label
            htmlFor="movie-guess-input"
            style={{
              fontWeight: 550,
              color: "#0a0030",
              marginBottom: 3,
              fontSize: "1.05em",
              alignSelf: "flex-start"
            }}
          >
            Type the movie name:
          </label>
          <input
            className="input"
            style={{
              marginTop: 0,
              marginBottom: 2,
              width: "96%",
              fontSize: "1.16em",
              textAlign: "center"
            }}
            type="text"
            id="movie-guess-input"
            placeholder="Enter movie name (not case sensitive)"
            maxLength={70}
            value={selected}
            enterKeyHint="done"
            autoFocus
            onChange={e => {
              setSelected(e.target.value);
            }}
            disabled={showCorrect || !!answers[currentIndex]}
            aria-label="Type the movie name"
            onKeyDown={e => {
              if (e.key === "Enter" && !showCorrect && !answers[currentIndex] && selected.length > 1)
                submitAnswer();
            }}
          />
          {(showCorrect || answers[currentIndex]) && (
            <div style={{
              marginTop: 5,
              color:
                (answers[currentIndex]?.correct || (showCorrect && isFuzzyMatch(selected, q.answer)))
                  ? "var(--success)"
                  : "var(--secondary)",
              fontWeight: 620,
              fontSize: "1.09em"
            }}>
              {(answers[currentIndex]?.correct || (showCorrect && isFuzzyMatch(selected, q.answer)))
                ? (
                  <span>✔ Correct! <span style={{ color: "#23b925" }}>{q.answer}</span></span>
                )
                : (
                  <span>✖ Incorrect. <span style={{ marginLeft: 6 }}>Answer:</span> <b style={{ color: "#23b925" }}>{q.answer}</b></span>
                )
              }
            </div>
          )}
        </div>
      ) : q.kind !== "timeline" ? (
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
      ) : null}

      {/* Action buttons for each input mode */}
      {!answers[currentIndex] && (
        <>
          {/* For timeline mode: enable only if a 4-digit number is entered */}
          {q.kind === "timeline" ? (
            <button
              className="btn btn-large"
              style={{
                background: /^\d{4}$/.test(selected) ? "var(--secondary)" : "#eee",
                color: /^\d{4}$/.test(selected) ? "#fff" : "var(--text-gray)",
                marginTop: 12,
                minWidth: 115
              }}
              disabled={!/^\d{4}$/.test(selected)}
              onClick={submitAnswer}
            >
              {currentIndex === questions.length - 1 ? "Finish" : "Next →"}
            </button>
          ) : q.kind === "guess" ? (
            <button
              className="btn btn-large"
              style={{
                background: selected && selected.trim().length > 1 ? "var(--secondary)" : "#eee",
                color: selected && selected.trim().length > 1 ? "#fff" : "var(--text-gray)",
                marginTop: 9,
                minWidth: 115
              }}
              disabled={!selected || selected.trim().length < 2}
              onClick={submitAnswer}
            >
              {currentIndex === questions.length - 1 ? "Finish" : "Next →"}
            </button>
          ) : (
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
        </>
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

/**
 * Clue 2 "Release Year" hint logic - initially hidden (unless question already answered), reveals on toggle.
 */
function GuessYearHint({ year, alreadyAnswered }) {
  const [show, setShow] = React.useState(false);
  // Auto-show if answered
  React.useEffect(() => { if (alreadyAnswered) setShow(true); }, [alreadyAnswered]);
  if (!year) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <span style={{
        fontWeight: 600,
        color: "#ff0597",
        marginRight: 4
      }}>Clue 2 (Release Year): </span>
      {show ? (
        <span style={{ color: "#ad23b9", fontWeight: 510 }}>{year}</span>
      ) : (
        <button
          onClick={() => setShow(true)}
          className="btn"
          style={{
            fontSize: "0.98em",
            padding: "4px 10px",
            marginLeft: 3,
            background: "#ecd7f9",
            color: "#700b8e",
            border: "1px solid #ad23b988"
          }}
        >Show Hint</button>
      )}
    </div>
  );
}
