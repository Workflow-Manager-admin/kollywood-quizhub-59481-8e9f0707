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

  // Helper to prepare a set of N distinct movies with valid release years
  function pickDistinctMovies(movieList, n = 4) {
    // Only unique titles, valid years
    let pool = shuffle(movieList.filter(
      m => m.title && m.release_date && /^\d{4}/.test(m.release_date)
    ));
    let unique = [];
    let titleSet = new Set();
    for (let m of pool) {
      if (unique.length >= n) break;
      if (!titleSet.has(m.title)) {
        unique.push(m);
        titleSet.add(m.title);
      }
    }
    return unique.length === n ? unique : null;
  }

  while (questions.length < numQuestions && moviesPage <= 5) {
    let moviesRes;
    try {
      moviesRes = await fetchPopularKollywood(moviesPage++);
    } catch (e) {
      return [];
    }
    let movies = moviesRes.results || [];
    movies = movies.filter(m => m.title && m.overview && m.poster_path);

    // Movie Timeline (timeline-NEW): Present 4 movies for each question, reorder by year
    if (type === "timeline") {
      // Try to get as many sets as possible from available movies for this page
      let taken = new Set();
      while (questions.length < numQuestions) {
        let set = pickDistinctMovies(movies.filter(m => !taken.has(m.title)), 4);
        if (!set) break;
        set.forEach(m => taken.add(m.title)); // avoid repetitions
        questions.push({
          kind: "timeline-order",
          q: `Arrange the following Kollywood movies in chronological order (ascending by release year):`,
          movies: shuffle([...set]), // randomized order
          answerOrder: [...set].sort((a, b) => (a.release_date > b.release_date ? 1 : a.release_date < b.release_date ? -1 : 0))
        });
      }
    } else {
      // Funnel legacy question logic for other types
      for (let movie of shuffle([...movies])) {
        if (questions.length >= numQuestions) break;

        // Guess the Movie mode: add actor & year clue
        if (type === "guess") {
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
          let cast = [], charName = null;
          try {
            const resp = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=5bc67d3b06aecbd18121a3cbbc16eb59`);
            cast = ((await resp.json()).cast || []);
            charName = extractCharacterName(cast);
          } catch (e) {
            charName = null;
          }
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
        // Desc mode
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
  }
  // If timeline mode, only return timeline-order questions; else, slice
  if (questions.length > numQuestions) return questions.slice(0, numQuestions);
  return questions;
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

/* Duplicate React import removed (was here) */
// ---- DraggableSortableList for Movie Timeline Mode ----
// Inline reorderable list (no external deps)
function DraggableSortableList({ items, onOrderChange, disabled }) {
  // items: [{id, label}]
  const [draggedIdx, setDraggedIdx] = useState(null);

  function handleDragStart(i) {
    setDraggedIdx(i);
  }
  function handleDragOver(e, i) {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === i) return;
    let newItems = [...items];
    const [removed] = newItems.splice(draggedIdx, 1);
    newItems.splice(i, 0, removed);
    setDraggedIdx(i);
    onOrderChange(newItems);
  }
  function handleDrop(e) {
    setDraggedIdx(null);
  }
  function handleKeyDown(e, i) {
    if (disabled) return;
    if (e.key === "ArrowUp" && i > 0) {
      let newItems = [...items];
      [newItems[i - 1], newItems[i]] = [newItems[i], newItems[i - 1]];
      onOrderChange(newItems);
      e.preventDefault();
    }
    if (e.key === "ArrowDown" && i < items.length - 1) {
      let newItems = [...items];
      [newItems[i], newItems[i + 1]] = [newItems[i + 1], newItems[i]];
      onOrderChange(newItems);
      e.preventDefault();
    }
  }

  return (
    <ul style={{
      listStyle: "none",
      padding: 0,
      margin: "20px 0 10px 0",
      width: "100%",
      maxWidth: 340
    }}>
      {items.map((item, i) => (
        <li
          key={item.id}
          draggable={!disabled}
          onDragStart={() => handleDragStart(i)}
          onDragOver={e => handleDragOver(e, i)}
          onDrop={handleDrop}
          tabIndex={0}
          onKeyDown={e => handleKeyDown(e, i)}
          aria-label={`Movie: ${item.label}, position ${i + 1}`}
          style={{
            padding: "14px 16px",
            marginBottom: 11,
            background: "#f7f8fc",
            border: disabled ? "1.5px solid #ececec" : "2px solid var(--secondary)",
            borderRadius: 8,
            color: "var(--accent)",
            fontWeight: 600,
            fontSize: "1.12rem",
            boxShadow: "0 2px 12px -7px #ad23b942",
            outline: draggedIdx === i ? "2.5px dashed #ff0597cc" : undefined,
            opacity: disabled ? 0.68 : 1,
            cursor: disabled ? "not-allowed" : "grab",
            transition: "background 0.10s, box-shadow 0.13s"
          }}
        >
          <span style={{
            marginRight: 10,
            fontWeight: 700,
            color: "var(--secondary)"
          }}>{i + 1}.</span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

// PUBLIC_INTERFACE
export function QuizGame({ config, user, onFinish, onCancel }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // array of {answer, correct, question}
  const [selected, setSelected] = useState(""); // user's current choice
  const [showCorrect, setShowCorrect] = useState(false);

  // Timeline mode state: user's movie order for timeline-order mode
  const [timelineOrder, setTimelineOrder] = useState([]);

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

  // When question changes, reset choice/order/feedback
  useEffect(() => {
    setSelected("");
    setShowCorrect(false);
    setTimelineOrder([]);
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

  // Handle answer selection and navigation (timeline mode is a sortable list)
  const submitAnswer = () => {
    const q = questions[currentIndex];

    if (q.kind === "timeline-order") {
      // Timeline-order: check if order matches sorted order
      if (!Array.isArray(timelineOrder) || timelineOrder.length !== 4) return;
    } else if (q.kind === "timeline") {
      if (!/^\d{4}$/.test(selected)) return;
    } else if (q.kind === "guess") {
      if (!selected || selected.trim().length < 2) return;
    } else {
      if (!selected) return;
    }

    let userInput, isCorrect;
    if (q.kind === "timeline-order") {
      userInput = timelineOrder.map(m => m.title);
      // Check if order matches by title with the correct order array (handle possible duplicate years)
      const answerTitles = q.answerOrder.map(m => m.title);
      isCorrect = userInput.join("|||") === answerTitles.join("|||");
    } else if (q.kind === "guess") {
      userInput = selected;
      isCorrect = isFuzzyMatch(userInput, q.answer);
    } else {
      userInput = selected;
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
    }, 950);
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

      {/* New Movie Timeline "Arrange Order" UI */}
      {q.kind === "timeline-order" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "#f8fafc",
            borderRadius: 11,
            border: "2px solid var(--secondary)",
            boxShadow: "0 2px 14px -7px #ff059779",
            padding: "22px 13px 18px 10px",
            minWidth: 300,
            maxWidth: 500,
            margin: "12px 0 6px 0"
          }}
        >
          <div style={{
            fontSize: "1.08em",
            fontWeight: 600,
            color: "#ff0597",
            marginBottom: 8,
            letterSpacing: "-0.7px"
          }}>
            <span role="img" aria-label="timeline">📝</span> Arrange by release year (oldest at top)
          </div>
          {/* Init timelineOrder to shuffled order on first render of question */}
          {timelineOrder.length !== 4 && setTimelineOrder(q.movies.map(m => ({
            ...m, id: m.id || m.title, label: m.title
          })))}
          <DraggableSortableList
            items={timelineOrder.length === 4 ? timelineOrder.map(m => ({ id: m.id || m.title, label: m.title })) : q.movies.map(m => ({ id: m.id || m.title, label: m.title }))}
            onOrderChange={
              arr => setTimelineOrder(arr.map(({ id }) => q.movies.find(m => (m.id || m.title) === id)))
            }
            disabled={showCorrect || !!answers[currentIndex]}
          />
          {(showCorrect || answers[currentIndex]) && (
            <div style={{
              marginTop: 7,
              color:
                (answers[currentIndex]?.correct || (
                  showCorrect &&
                  timelineOrder
                    .map(m => m.title)
                    .join("|||") === q.answerOrder.map(m => m.title).join("|||")
                )) ? "var(--success)" : "var(--secondary)",
              fontWeight: 650,
              fontSize: "1.09em"
            }}>
              {(answers[currentIndex]?.correct || (
                showCorrect &&
                timelineOrder
                  .map(m => m.title)
                  .join("|||") === q.answerOrder.map(m => m.title).join("|||")
              ))
                ? (
                  <span>✔ Correct! {q.answerOrder.map(m => `${m.title} (${m.release_date.slice(0, 4)})`).join(" → ")}</span>
                )
                : (
                  <span>
                    ✖ Incorrect.
                    <span style={{ marginLeft: 6 }}>Correct order:</span>
                    <span style={{ color: "#23b925", marginLeft: 5 }}>
                      {q.answerOrder.map(m => `${m.title} (${m.release_date.slice(0, 4)})`).join(" → ")}
                    </span>
                  </span>
                )
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
      {q.kind === "timeline-order" ? null : (
        q.kind === "guess" ? (
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
        ) : null
      )}

      {/* Action buttons for each input mode */}
      {!answers[currentIndex] && (
        <>
          {/* For timeline reorder mode: must have order of 4 */}
          {q.kind === "timeline-order" ? (
            <button
              className="btn btn-large"
              style={{
                background: Array.isArray(timelineOrder) && timelineOrder.length === 4 ? "var(--secondary)" : "#eee",
                color: Array.isArray(timelineOrder) && timelineOrder.length === 4 ? "#fff" : "var(--text-gray)",
                marginTop: 13,
                minWidth: 145
              }}
              disabled={!Array.isArray(timelineOrder) || timelineOrder.length !== 4}
              onClick={submitAnswer}
            >
              {currentIndex === questions.length - 1 ? "Finish" : "Next →"}
            </button>
          ) : q.kind === "timeline" ? (
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
