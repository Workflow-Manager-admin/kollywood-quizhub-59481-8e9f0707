import React, { useState, useMemo } from "react";
import "./App.css";
import { Login } from "./components/Login";
import { GameSelector } from "./components/GameSelector";
import { QuizGame } from "./components/QuizGame";
import { Progress } from "./components/Progress";
import { QuizManager } from "./components/QuizManager";

/**
 * App color scheme (palette) applied via App.css:
 *  primary: #ffffff (background), secondary: #ff0597 (accent/pink), accent: #0a0003 (titles/icons), base-light: #00ffff, base-dark: #00008b
 */

// PUBLIC_INTERFACE
function App() {
  const [user, setUser] = useState(null); // { name, avatar? }
  const [currentScreen, setCurrentScreen] = useState("login"); // login | select | quiz | result | manage
  const [quizConfig, setQuizConfig] = useState(null); // {type, numQuestions, ...}
  const [quizResult, setQuizResult] = useState(null); // {score, questionResults}
  const [quizState, setQuizState] = useState(null);   // for quiz in progress

  // For restarting or returning to quiz selection
  const resetQuiz = () => {
    setQuizConfig(null);
    setQuizResult(null);
    setQuizState(null);
    setCurrentScreen("select");
  };

  // Handle login
  const doLogin = (userInfo) => {
    setUser(userInfo);
    setCurrentScreen("select");
  };

  // Start quiz with config
  const startQuiz = (cfg) => {
    setQuizConfig(cfg);
    setQuizResult(null);
    setCurrentScreen("quiz");
  };

  // When quiz game finishes
  const onQuizFinish = (result, state) => {
    setQuizResult(result);
    setQuizState(state);
    setCurrentScreen("result");
  };

  // Navigation for management
  const gotoManage = () => setCurrentScreen("manage");
  const gotoSelect = () => setCurrentScreen("select");
  const logout = () => {
    setUser(null);
    setCurrentScreen("login");
    setQuizConfig(null);
    setQuizResult(null);
    setQuizState(null);
  };

  return (
    <div className="app kollywood-bg">
      <nav className="navbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: "100%" }}>
          <div className="logo" tabIndex={0}>
            <span className="logo-symbol" role="img" aria-label="Kollywood icon">🎬</span>
            <span style={{
              color: "var(--accent)",
              fontWeight: 700,
              textShadow: "0 2px 10px #ff059728,0 4px 26px #fff3"
            }}>Kollywood QuizHub</span>
          </div>
          {user && (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{
                color: "var(--accent)",
                fontWeight: 600,
                fontSize: "1.07rem"
              }}>{user.name}</span>
              <button className="btn" style={{ background: "var(--secondary)" }} onClick={gotoManage}>Quiz Manager</button>
              <button className="btn" style={{ background: "var(--accent)" , color: "#fff"}} onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </nav>

      <main>
        <div className="container" style={{ paddingTop: "36px" }}>
          {currentScreen === "login" && <Login onLogin={doLogin} />}
          {currentScreen === "select" && <GameSelector startQuiz={startQuiz} user={user} />}
          {currentScreen === "quiz" && quizConfig && (
            <QuizGame
              config={quizConfig}
              user={user}
              onFinish={onQuizFinish}
              onCancel={resetQuiz}
            />
          )}
          {currentScreen === "result" && quizResult && (
            <Progress
              result={quizResult}
              user={user}
              onRestart={resetQuiz}
              quizState={quizState}
            />
          )}
          {currentScreen === "manage" && (
            <QuizManager onBack={gotoSelect} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
