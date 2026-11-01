import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/entries`;

const moods = [
  { value: "happy", label: "Happy", emoji: "☀️" },
  { value: "peaceful", label: "Peaceful", emoji: "🌿" },
  { value: "grateful", label: "Grateful", emoji: "🤎" },
  { value: "sad", label: "Sad", emoji: "🌧️" },
  { value: "anxious", label: "Anxious", emoji: "🌫️" },
  { value: "excited", label: "Excited", emoji: "✨" },
  { value: "reflective", label: "Reflective", emoji: "🌙" },
];

const localKey = "memory-diary-entries";

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(localKey) || "[]");
  } catch {
    return [];
  }
}

function saveCache(entries) {
  localStorage.setItem(localKey, JSON.stringify(entries));
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function App() {
  const [entries, setEntries] = useState(readCache);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMood, setSelectedMood] = useState("all");
  const [activeEntry, setActiveEntry] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({
    title: "",
    content: "",
    mood: "reflective",
    entryDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      try {
        const response = await fetch(API);
        if (!response.ok) throw new Error("Could not load entries");

        const data = await response.json();
        if (cancelled) return;

        setEntries(data);
        saveCache(data);
        setOnline(true);
      } catch {
        if (!cancelled) {
          setOnline(false);
          setNotice("Showing your saved entries from this device.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEntries();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveCache(entries);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const query = search.toLowerCase().trim();

    return entries.filter((entry) => {
      const matchesSearch =
        !query ||
        entry.title?.toLowerCase().includes(query) ||
        entry.content?.toLowerCase().includes(query);

      const matchesMood = selectedMood === "all" || entry.mood === selectedMood;

      return matchesSearch && matchesMood;
    });
  }, [entries, search, selectedMood]);

  function startNewEntry() {
    setActiveEntry(null);
    setForm({
      title: "",
      content: "",
      mood: "reflective",
      entryDate: new Date().toISOString().slice(0, 10),
    });
    setShowEditor(true);
  }

  function startEditEntry(entry) {
    setActiveEntry(entry);
    setForm({
      title: entry.title || "",
      content: entry.content || "",
      mood: entry.mood || "reflective",
      entryDate: new Date(entry.entryDate || entry.createdAt)
        .toISOString()
        .slice(0, 10),
    });
    setShowEditor(true);
  }

  async function saveEntry(event) {
    event.preventDefault();

    const payload = {
      ...form,
      entryDate: new Date(`${form.entryDate}T12:00:00`).toISOString(),
    };

    try {
      const response = await fetch(
        activeEntry ? `${API}/${activeEntry._id}` : API,
        {
          method: activeEntry ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "Could not save entry");
      }

      const saved = await response.json();

      setEntries((current) =>
        activeEntry
          ? current.map((entry) => (entry._id === saved._id ? saved : entry))
          : [saved, ...current],
      );

      setOnline(true);
      setNotice("Your memory has been saved.");
      setShowEditor(false);
    } catch (error) {
      setOnline(false);
      setNotice(
        `Couldn't save to the cloud: ${error.message}. Your existing cached entries remain available.`,
      );
    }
  }

  async function deleteEntry(entry) {
    if (!window.confirm("Delete this memory forever?")) return;

    try {
      const response = await fetch(`${API}/${entry._id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      setEntries((current) => current.filter((item) => item._id !== entry._id));
      setActiveEntry(null);
      setNotice("Memory deleted.");
      setOnline(true);
    } catch (error) {
      setNotice(`Couldn't delete this memory: ${error.message}`);
    }
  }

  const today = new Date();
  const todayLabel = today.toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setActiveEntry(null)}>
          <span className="brand-mark">m</span>
          <span>
            <strong>memory</strong>
            <small>a little home for your thoughts</small>
          </span>
        </a>

        <div className="sidebar-section">
          <p className="sidebar-label">YOUR SPACE</p>
          <button
            className="nav-item active"
            onClick={() => {
              setActiveEntry(null);
              setShowEditor(false);
            }}
          >
            <span>▤</span> My journal
          </button>
          <button className="nav-item" onClick={startNewEntry}>
            <span>＋</span> Write a memory
          </button>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-label">HOW ARE YOU FEELING?</p>
          <button
            className={`mood-filter ${selectedMood === "all" ? "selected" : ""}`}
            onClick={() => setSelectedMood("all")}
          >
            <span>✿</span> All feelings
          </button>
          {moods.map((mood) => (
            <button
              key={mood.value}
              className={`mood-filter ${selectedMood === mood.value ? "selected" : ""}`}
              onClick={() => setSelectedMood(mood.value)}
            >
              <span>{mood.emoji}</span> {mood.label}
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <span className={`connection-dot ${online ? "connected" : ""}`} />
          <span>{online ? "Cloud connected" : "Device journal"}</span>
          <small>{entries.length} memories</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span className="eyebrow">{todayLabel.toUpperCase()}</span>
          <button className="write-button" onClick={startNewEntry}>
            <span>＋</span> Write a memory
          </button>
        </header>

        <section className="welcome">
          <div className="welcome-copy">
            <p className="eyebrow">A MOMENT JUST FOR YOU</p>
            <h1>
              Your life, in little <em>moments.</em>
            </h1>
            <p className="welcome-description">
              A quiet place to collect your thoughts, notice the little things,
              and remember what matters.
            </p>
          </div>
          <div className="sun-art" aria-hidden="true">
            <span className="sun-circle">☼</span>
            <span className="sun-leaf leaf-one">❧</span>
            <span className="sun-leaf leaf-two">❧</span>
          </div>
        </section>

        <section className="journal-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR PRIVATE CORNER</p>
              <h2>{search ? "Found moments" : "Collected moments"}</h2>
            </div>
            <span className="entry-count">
              {filteredEntries.length}{" "}
              {filteredEntries.length === 1 ? "memory" : "memories"}
            </span>
          </div>

          <label className="search-box">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Search your memories..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>

          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button onClick={() => setNotice("")} aria-label="Dismiss">
                ×
              </button>
            </div>
          )}

          {loading ? (
            <div className="empty-state">
              <span className="empty-icon">☁</span>
              <h3>Gathering your memories...</h3>
              <p>Just a little moment.</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">✿</span>
              <h3>
                {search || selectedMood !== "all"
                  ? "No moments found"
                  : "A fresh page, just for you."}
              </h3>
              <p>
                {search || selectedMood !== "all"
                  ? "Try another search or feeling."
                  : "Your memories begin with one small thought. No need to make it perfect."}
              </p>
              {!search && selectedMood === "all" && (
                <button className="write-button" onClick={startNewEntry}>
                  ＋ Write your first memory
                </button>
              )}
            </div>
          ) : (
            <div className="entry-grid">
              {filteredEntries.map((entry) => {
                const mood = moods.find((item) => item.value === entry.mood);

                return (
                  <article className="entry-card" key={entry._id}>
                    <div className="entry-card-top">
                      <span className="entry-mood">
                        {mood?.emoji || "🌙"} {mood?.label || "Reflective"}
                      </span>
                      <button
                        className="more-button"
                        onClick={() => startEditEntry(entry)}
                        aria-label={`Edit ${entry.title}`}
                      >
                        ↗
                      </button>
                    </div>
                    <button
                      className="entry-open"
                      onClick={() => setActiveEntry(entry)}
                    >
                      <h3>{entry.title}</h3>
                      <p>{entry.content}</p>
                    </button>
                    <div className="entry-card-footer">
                      <span>
                        {formatDate(entry.entryDate || entry.createdAt)}
                      </span>
                      <button onClick={() => startEditEntry(entry)}>
                        Edit memory ↗
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="page-footer">
          <span>Made with a little care, just for you.</span>
          <span>♡</span>
        </footer>
      </main>

      {showEditor && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowEditor(false);
          }}
        >
          <form className="editor-modal" onSubmit={saveEntry}>
            <div className="modal-heading">
              <div>
                <p className="eyebrow">TAKE YOUR TIME</p>
                <h2>
                  {activeEntry ? "Revisit this memory" : "A little moment"}
                </h2>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={() => setShowEditor(false)}
              >
                ×
              </button>
            </div>

            <label className="field-label">
              Give this memory a name
              <input
                required
                maxLength={150}
                placeholder="The day felt like sunshine..."
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
            </label>

            <label className="field-label">
              What would you like to remember?
              <textarea
                required
                rows={7}
                placeholder="Start wherever your thoughts take you. This space is yours..."
                value={form.content}
                onChange={(event) =>
                  setForm({ ...form, content: event.target.value })
                }
              />
            </label>

            <label className="field-label">
              The date
              <input
                required
                type="date"
                value={form.entryDate}
                onChange={(event) =>
                  setForm({ ...form, entryDate: event.target.value })
                }
              />
            </label>

            <div className="field-label">
              What does this moment feel like?
              <div className="mood-picker">
                {moods.map((mood) => (
                  <button
                    type="button"
                    key={mood.value}
                    className={`mood-option ${form.mood === mood.value ? "chosen" : ""}`}
                    onClick={() => setForm({ ...form, mood: mood.value })}
                  >
                    <span>{mood.emoji}</span>
                    {mood.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              {activeEntry && (
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => deleteEntry(activeEntry)}
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                className="cancel-button"
                onClick={() => setShowEditor(false)}
              >
                Cancel
              </button>
              <button type="submit" className="write-button">
                Save memory ♡
              </button>
            </div>
          </form>
        </div>
      )}

      {activeEntry && !showEditor && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveEntry(null);
          }}
        >
          <article className="reader-modal">
            <button
              className="close-button reader-close"
              onClick={() => setActiveEntry(null)}
            >
              ×
            </button>
            <p className="eyebrow">
              {formatDate(activeEntry.entryDate || activeEntry.createdAt)}
            </p>
            <h2>{activeEntry.title}</h2>
            <span className="entry-mood">
              {moods.find((item) => item.value === activeEntry.mood)?.emoji ||
                "🌙"}{" "}
              {moods.find((item) => item.value === activeEntry.mood)?.label ||
                "Reflective"}
            </span>
            <p className="reader-content">{activeEntry.content}</p>
            <button
              className="write-button"
              onClick={() => startEditEntry(activeEntry)}
            >
              Edit this memory ↗
            </button>
          </article>
        </div>
      )}
    </div>
  );
}
