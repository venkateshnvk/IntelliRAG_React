import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const BASE_URL = "https://intellirag-c0bab6hadgf8fmfp.centralindia-01.azurewebsites.net";

function App() {

  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionIndex, setActiveSessionIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef(null);

  /* =========================
     Load Patients
  ========================== */

  useEffect(() => {

    fetch(`${BASE_URL}/patients`)
      .then(res => res.json())
      .then(data => {

        const list = data.patients || [];
        setPatients(list);

        if (list.length > 0) {
          setSelectedPatient(list[0]);
        }

      })
      .catch(err => console.error(err));

  }, []);

  /* =========================
     Auto Scroll Chat
  ========================== */

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  /* =========================
     Submit Query
  ========================== */

const handleSubmit = async () => {

  if (!question.trim()) return;

  setLoading(true);

  try {

    const res = await fetch(`${BASE_URL}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        patient_id: selectedPatient,
        query: question
      })
    });

    if (!res.ok) {
      throw new Error(`API Error ${res.status}`);
    }

    const data = await res.json();

    console.log("API RESPONSE:", data);

    let formattedAnswer = "No answer returned";
    let formattedEvidence = "No evidence available";

    if (data.answer) {

      formattedAnswer =
        data.answer.answer || "No structured answer found";

      formattedEvidence =
        data.answer.evidence?.join("\n") ||
        "No supporting evidence available";
    }

    const newEntry = {
      question,
      answer: formattedAnswer,
      evidence: formattedEvidence,
      confidence: data.retrieval_confidence_level || "Unknown",
      latency: data.latency_ms || 0,
      model: data.model_used || "gpt-4o-mini"
    };

    setChatHistory(prev => [...prev, newEntry]);

    setQuestion("");

  } catch (err) {

    console.error("API ERROR:", err);

    const newEntry = {
      question,
      answer: "Server error occurred.",
      evidence: "Check backend logs.",
      confidence: "Error",
      latency: 0,
      model: "-"
    };

    setChatHistory(prev => [...prev, newEntry]);

  }

  setLoading(false);

};

  /* =========================
     Session Controls
  ========================== */

  const handleSaveSession = () => {

    if (chatHistory.length === 0) return;

    const newSession = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      data: chatHistory
    };

    setSessions(prev => [...prev, newSession]);
    setActiveSessionIndex(sessions.length);
    setChatHistory([]);

  };

  const handleDownloadSession = () => {

    if (chatHistory.length === 0) return;

    const blob = new Blob(
      [JSON.stringify(chatHistory, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `intellirag_session_${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);

  };

  const handleClearChat = () => setChatHistory([]);

  /* =========================
     Analytics
  ========================== */

  const totalQueries = chatHistory.length;

  const avgLatency =
    totalQueries > 0
      ? (
          chatHistory.reduce((sum, item) => sum + item.latency, 0) /
          totalQueries
        ).toFixed(0)
      : 0;

  const latencyData = chatHistory.map((item, index) => ({
    name: `Q${index + 1}`,
    latency: item.latency
  }));

  /* =========================
     UI
  ========================== */

  return (
    <div className="app-container">

      {/* Sidebar */}

      <div className="sidebar">

        <h2>IntelliRAG</h2>

        <div className="sidebar-section">
          <h4>PATIENT</h4>

          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
          >
            {patients.map((p, i) => (
              <option key={i}>{p}</option>
            ))}
          </select>

        </div>

        <div className="sidebar-section">
          <h4>RECENT SESSIONS</h4>

          {sessions.map((session, index) => (

            <div
              key={session.id}
              className={`session-item ${
                activeSessionIndex === index ? "active" : ""
              }`}
              onClick={() => {

                setChatHistory(session.data);
                setActiveSessionIndex(index);

              }}
            >
              Session {index + 1}

              <div className="session-time">
                {session.timestamp}
              </div>

            </div>

          ))}

        </div>

        <div className="sidebar-section">

          <h4>RETRIEVAL ANALYTICS</h4>

          <div className="metric-row">
            <span>Total Queries</span>
            <span>{totalQueries}</span>
          </div>

          <div className="metric-row">
            <span>Avg Latency</span>
            <span>{avgLatency} ms</span>
          </div>

          {totalQueries > 1 && (

            <ResponsiveContainer width="100%" height={120}>

              <LineChart data={latencyData}>

                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip formatter={(v) => `${v} ms`} />

                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />

              </LineChart>

            </ResponsiveContainer>

          )}

        </div>

      </div>

      {/* Workspace */}

      <div className="workspace">

        <div className="header">

          <span>Enterprise Healthcare AI Assistant</span>

          <div>

            <button className="save-btn" onClick={handleSaveSession}>
              Save Session
            </button>

            <button className="download-btn" onClick={handleDownloadSession}>
              Download
            </button>

            <button className="clear-btn" onClick={handleClearChat}>
              Clear Session
            </button>

          </div>

        </div>

        {/* Chat */}

        <div className="chat-area">

          {chatHistory.map((item, index) => (

            <div key={index} className="chat-block">

              <div className="question-bubble">
                {item.question}
              </div>

              <div className="answer-card">

                <div className="answer-text" style={{ whiteSpace: "pre-line" }}>
                  {item.answer}
                </div>

                <div className="meta-row">

                  <span className="badge confidence">
                    Confidence: {item.confidence}
                  </span>

                  <span className="badge latency">
                    ⚡ {item.latency.toFixed(0)} ms
                  </span>

                  <span className="badge model">
                    {item.model}
                  </span>

                </div>

                <details className="evidence-section">

                  <summary>Supporting Evidence</summary>

                  <p style={{ whiteSpace: "pre-line" }}>
                    {item.evidence}
                  </p>

                </details>

              </div>

            </div>

          ))}

          {loading && (
            <div className="loading">
              Processing with IntelliRAG...
            </div>
          )}

          <div ref={chatEndRef}></div>

        </div>

        {/* Input */}

        <div className="input-area">

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Search with IntelliRAG AI..."
            onKeyDown={(e) => {

              if (e.key === "Enter" && !e.shiftKey) {

                e.preventDefault();
                handleSubmit();

              }

            }}
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Processing..." : "Generate Answer"}
          </button>

        </div>

      </div>

    </div>
  );
}

export default App;
