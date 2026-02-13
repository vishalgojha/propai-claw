import { useEffect, useMemo, useState } from "react";

const sampleLeads = [
  {
    id: 1,
    lead_name: "Arjun Mehta",
    phone: "+91 98XXXXXX12",
    intent: "buy",
    budget: "1.5 Cr",
    location: "Andheri West",
    configuration: "2 BHK",
    timeline: "30 days",
    status: "hot",
    last_message_at: "2026-02-13T19:10:00Z"
  },
  {
    id: 2,
    lead_name: "Nisha Kapoor",
    phone: "+91 98XXXXXX45",
    intent: "rent",
    budget: "85k/month",
    location: "Bandra East",
    configuration: "3 BHK",
    timeline: "urgent",
    status: "warm",
    last_message_at: "2026-02-12T13:40:00Z"
  },
  {
    id: 3,
    lead_name: "Dev Patel",
    phone: "+91 98XXXXXX78",
    intent: "sell",
    budget: "4.2 Cr",
    location: "Powai",
    configuration: "4 BHK",
    timeline: "60 days",
    status: "cold",
    last_message_at: "2026-02-10T08:25:00Z"
  }
];

const sampleMessages = [
  { id: 1, direction: "in", content: "Looking for a 2BHK in Andheri West", created_at: "2026-02-13T19:10:00Z" },
  { id: 2, direction: "out", content: "Got it. Budget range and timeline?", created_at: "2026-02-13T19:11:00Z" },
  { id: 3, direction: "in", content: "Budget is 1.5 Cr, can close in a month", created_at: "2026-02-13T19:12:00Z" }
];

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function timeSince(value) {
  if (!value) return "-";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "moments ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function useBackendData() {
  const [leads, setLeads] = useState([]);
  const [activeLead, setActiveLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/leads");
        if (!response.ok) throw new Error("Failed to load leads");
        const data = await response.json();
        if (!active) return;
        setLeads(data);
        setActiveLead(data[0] || null);
      } catch (err) {
        setError(err.message);
        setLeads(sampleLeads);
        setActiveLead(sampleLeads[0]);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadMessages() {
      if (!activeLead) return;
      try {
        const response = await fetch(`/api/leads/${activeLead.id}/messages`);
        if (!response.ok) throw new Error("Failed to load messages");
        const data = await response.json();
        if (!active) return;
        setMessages(data);
      } catch (_) {
        setMessages(sampleMessages);
      }
    }
    loadMessages();
    return () => {
      active = false;
    };
  }, [activeLead]);

  return { leads, activeLead, setActiveLead, messages, loading, error };
}

function useAnalyzer() {
  const [brochure, setBrochure] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyze() {
    if (!brochure.trim()) return;
    setLoading(true);
    setAnalysis("");
    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "web",
          content: `analyze brochure: ${brochure}`
        })
      });
      const data = await response.json();
      setAnalysis(data.reply || "");
    } catch (_) {
      setAnalysis("Unable to reach backend. Start the server to run analysis.");
    } finally {
      setLoading(false);
    }
  }

  return {
    brochure,
    setBrochure,
    analysis,
    analyze,
    loading
  };
}

function useMarketSearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function runSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setResult("");
    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "web",
          content: `search: ${query}`
        })
      });
      const data = await response.json();
      setResult(data.reply || "");
    } catch (_) {
      setResult("Unable to reach backend. Start the server to run search.");
    } finally {
      setLoading(false);
    }
  }

  return {
    query,
    setQuery,
    result,
    runSearch,
    loading
  };
}

function statusTag(status) {
  if (status === "hot") return "tag tag-hot";
  if (status === "warm") return "tag tag-warm";
  return "tag tag-cold";
}

function computeRiskFlags(lead) {
  const flags = [];
  if (!lead.budget) flags.push("Budget missing");
  if (!lead.timeline) flags.push("Timeline missing");
  if (!lead.configuration) flags.push("Configuration missing");
  if (!lead.location) flags.push("Location missing");
  if (!flags.length) flags.push("No risks flagged");
  return flags;
}

function computeNextAction(lead) {
  if (!lead.budget) return "Ask budget range and financing plan.";
  if (!lead.location) return "Confirm preferred micro-market.";
  if (!lead.configuration) return "Confirm configuration and floor preference.";
  if (!lead.timeline) return "Confirm expected closing timeline.";
  return "Share shortlisted listings and schedule site visit.";
}

export default function App() {
  const { leads, activeLead, setActiveLead, messages, loading, error } =
    useBackendData();
  const analyzer = useAnalyzer();
  const market = useMarketSearch();

  const stats = useMemo(() => {
    const hot = leads.filter((lead) => lead.status === "hot").length;
    const warm = leads.filter((lead) => lead.status === "warm").length;
    const cold = leads.filter((lead) => lead.status === "cold").length;
    const pipeline = hot + warm;
    return { hot, warm, cold, pipeline };
  }, [leads]);

  return (
    <div className="min-h-screen text-text">
      <div className="grid-overlay animate-glow" />
      <div className="shell-container px-6 pb-16 pt-10 lg:px-12">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-textMuted">
              PropAI Command Center
            </p>
            <h1 className="text-3xl font-semibold">Mumbai Deal Operations</h1>
            <p className="mt-2 text-sm text-textMuted">
              Live lead intelligence, conversation flow, and market responses.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-border bg-panel px-4 py-2 text-xs">
              Backend: {error ? "offline" : "connected"}
            </div>
            <button className="rounded-full border border-border bg-panel px-4 py-2 text-xs text-textMuted transition hover:text-text">
              Sync WhatsApp
            </button>
            <button className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-base">
              New follow-up
            </button>
          </div>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {[
            { label: "Hot leads", value: stats.hot, tone: "text-bad" },
            { label: "Warm leads", value: stats.warm, tone: "text-warn" },
            { label: "Cold leads", value: stats.cold, tone: "text-textMuted" },
            { label: "Unread", value: 0, tone: "text-text" },
            { label: "Pipeline", value: stats.pipeline, tone: "text-accentStrong" },
            { label: "Market alerts", value: 0, tone: "text-textMuted" }
          ].map((tile, index) => (
            <div
              key={tile.label}
              className="card fade-in px-4 py-5"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <p className="text-xs uppercase tracking-[0.3em] text-textMuted">
                {tile.label}
              </p>
              <p className={`mt-3 text-2xl font-semibold ${tile.tone}`}>
                {loading ? "..." : tile.value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1fr_2fr_1.2fr]">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm uppercase tracking-[0.3em] text-textMuted">
                Leads
              </h2>
              <div className="flex gap-2 text-xs">
                <span className="rounded-full border border-border px-2 py-1">
                  All
                </span>
                <span className="rounded-full border border-border px-2 py-1">
                  Hot
                </span>
                <span className="rounded-full border border-border px-2 py-1">
                  New
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setActiveLead(lead)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    activeLead?.id === lead.id
                      ? "border-accent bg-panelStrong"
                      : "border-border bg-panel hover:border-accent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {lead.lead_name || "Unnamed lead"}
                      </p>
                      <p className="text-xs text-textMuted">
                        {lead.location || "Unknown location"} •{" "}
                        {lead.configuration || "Config TBD"}
                      </p>
                    </div>
                    <span className={statusTag(lead.status)}>
                      {lead.status || "new"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-textMuted">
                    Last touch {timeSince(lead.last_message_at)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm uppercase tracking-[0.3em] text-textMuted">
                Conversation
              </h2>
              <div className="text-xs text-textMuted">
                {activeLead ? activeLead.phone : "No lead selected"}
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {messages.length ? (
                messages
                  .slice()
                  .reverse()
                  .map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.direction === "out"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                          message.direction === "out"
                            ? "bg-accent text-base"
                            : "bg-panelStrong text-text"
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className="mt-2 text-xs opacity-60">
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-textMuted">
                  No messages yet. Start a conversation to see context here.
                </p>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-sm uppercase tracking-[0.3em] text-textMuted">
              Lead Intelligence
            </h2>
            {activeLead ? (
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="text-xs uppercase text-textMuted">Profile</p>
                  <p className="mt-2 font-semibold">
                    {activeLead.lead_name || "Unnamed lead"}
                  </p>
                  <p className="text-textMuted">{activeLead.phone || "-"}</p>
                </div>
                <div className="grid gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-textMuted">Intent</span>
                    <span>{activeLead.intent || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textMuted">Budget</span>
                    <span>{activeLead.budget || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textMuted">Location</span>
                    <span>{activeLead.location || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textMuted">Timeline</span>
                    <span>{activeLead.timeline || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textMuted">Score</span>
                    <span className={statusTag(activeLead.status)}>
                      {activeLead.status || "new"}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase text-textMuted">Risk flags</p>
                  <div className="mt-2 space-y-1 text-xs text-textMuted">
                    {computeRiskFlags(activeLead).map((flag) => (
                      <p key={flag}>• {flag}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase text-textMuted">Next action</p>
                  <p className="mt-2 text-xs text-textMuted">
                    {computeNextAction(activeLead)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-textMuted">
                    Follow-up timer
                  </p>
                  <p className="mt-2 text-xs text-textMuted">
                    Last touch {timeSince(activeLead.last_message_at)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-textMuted">
                Select a lead to view intelligence.
              </p>
            )}
          </div>
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-2">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm uppercase tracking-[0.3em] text-textMuted">
                Property Analyzer
              </h2>
              <span className="text-xs text-textMuted">
                AI brochure breakdown
              </span>
            </div>
            <textarea
              value={analyzer.brochure}
              onChange={(event) => analyzer.setBrochure(event.target.value)}
              placeholder="Paste brochure text or property highlights..."
              className="mt-4 h-40 w-full rounded-xl border border-border bg-panelStrong p-4 text-sm text-text outline-none focus:border-accent"
            />
            <button
              onClick={analyzer.analyze}
              className="mt-4 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-base"
            >
              {analyzer.loading ? "Analyzing..." : "Run analysis"}
            </button>
            <div className="mt-4 whitespace-pre-wrap text-sm text-textMuted">
              {analyzer.analysis || "Analysis output will appear here."}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm uppercase tracking-[0.3em] text-textMuted">
                Market Research
              </h2>
              <span className="text-xs text-textMuted">
                Search + summary
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input
                value={market.query}
                onChange={(event) => market.setQuery(event.target.value)}
                placeholder="Andheri West circle rate"
                className="w-full flex-1 rounded-xl border border-border bg-panelStrong p-3 text-sm text-text outline-none focus:border-accent"
              />
              <button
                onClick={market.runSearch}
                className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-base"
              >
                {market.loading ? "Searching..." : "Run search"}
              </button>
            </div>
            <div className="mt-4 whitespace-pre-wrap text-sm text-textMuted">
              {market.result || "Search results and summary will appear here."}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
