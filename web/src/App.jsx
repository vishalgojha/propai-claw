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

function useWorkflowRuns() {
  const [runs, setRuns] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadRuns() {
      try {
        const response = await fetch("/api/workflows");
        if (!response.ok) throw new Error("Failed to load workflows");
        const data = await response.json();
        if (active) setRuns(data);
      } catch (_) {
        setRuns([]);
      }
    }
    loadRuns();
    return () => {
      active = false;
    };
  }, []);

  return runs;
}

function useMarketInfo() {
  const [market, setMarket] = useState({ city: "Mumbai", notes: "" });

  useEffect(() => {
    let active = true;
    async function loadMarket() {
      try {
        const response = await fetch("/api/market");
        if (!response.ok) throw new Error("Failed to load market");
        const data = await response.json();
        if (active) setMarket(data || {});
      } catch (_) {
        setMarket({ city: "Mumbai", notes: "" });
      }
    }
    loadMarket();
    return () => {
      active = false;
    };
  }, []);

  return market;
}

function useMemory(activeLead, market, refreshKey) {
  const [leadMemory, setLeadMemory] = useState("");
  const [marketMemory, setMarketMemory] = useState("");
  const [globalMemory, setGlobalMemory] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadLeadMemory() {
      if (!activeLead) return;
      try {
        const response = await fetch(
          `/api/memory?scope=lead&key=${activeLead.id}`
        );
        if (!response.ok) throw new Error("Missing lead memory");
        const data = await response.json();
        if (active) setLeadMemory(data.content || "");
      } catch (_) {
        if (active) setLeadMemory("");
      }
    }
    loadLeadMemory();
    return () => {
      active = false;
    };
  }, [activeLead, refreshKey]);

  useEffect(() => {
    let active = true;
    async function loadMarketMemory() {
      if (!market || !market.city) return;
      try {
        const response = await fetch(
          `/api/memory?scope=market&key=${encodeURIComponent(market.city)}`
        );
        if (!response.ok) throw new Error("Missing market memory");
        const data = await response.json();
        if (active) setMarketMemory(data.content || "");
      } catch (_) {
        if (active) setMarketMemory("");
      }
    }
    loadMarketMemory();
    return () => {
      active = false;
    };
  }, [market, refreshKey]);

  useEffect(() => {
    let active = true;
    async function loadGlobalMemory() {
      try {
        const response = await fetch("/api/memory?scope=global&limit=5");
        if (!response.ok) throw new Error("Missing global memory");
        const data = await response.json();
        if (active) setGlobalMemory(data);
      } catch (_) {
        if (active) setGlobalMemory([]);
      }
    }
    loadGlobalMemory();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  return { leadMemory, marketMemory, globalMemory };
}

function statusTag(status) {
  if (status === "hot") return "tag tag-hot";
  if (status === "warm") return "tag tag-warm";
  return "tag tag-cold";
}

function workflowTag(status) {
  if (status === "success") return "tag tag-ok";
  if (status === "running") return "tag tag-run";
  return "tag tag-fail";
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
  const workflowRuns = useWorkflowRuns();
  const marketInfo = useMarketInfo();
  const [memoryRefreshKey, setMemoryRefreshKey] = useState(0);
  const memory = useMemory(activeLead, marketInfo, memoryRefreshKey);
  const [memoryScope, setMemoryScope] = useState("lead");
  const [memoryKey, setMemoryKey] = useState("");
  const [memoryContent, setMemoryContent] = useState("");
  const [memoryStatus, setMemoryStatus] = useState("");
  const [memorySaving, setMemorySaving] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
  const [workflowDetail, setWorkflowDetail] = useState(null);
  const [workflowDetailLoading, setWorkflowDetailLoading] = useState(false);
  const [consoleToken, setConsoleToken] = useState(
    () => localStorage.getItem("propai_token") || ""
  );
  const [consoleInput, setConsoleInput] = useState("");
  const [consoleMessages, setConsoleMessages] = useState([]);
  const [consoleStatus, setConsoleStatus] = useState("");
  const [consoleRole, setConsoleRole] = useState("");

  const stats = useMemo(() => {
    const hot = leads.filter((lead) => lead.status === "hot").length;
    const warm = leads.filter((lead) => lead.status === "warm").length;
    const cold = leads.filter((lead) => lead.status === "cold").length;
    const pipeline = hot + warm;
    return { hot, warm, cold, pipeline };
  }, [leads]);

  useEffect(() => {
    if (memoryScope === "lead") {
      if (activeLead) {
        setMemoryKey(String(activeLead.id));
        setMemoryContent(memory.leadMemory || "");
      }
    } else if (memoryScope === "market") {
      if (marketInfo && marketInfo.city) {
        setMemoryKey(marketInfo.city);
        setMemoryContent(memory.marketMemory || "");
      }
    } else if (memoryScope === "global") {
      if (!memoryKey) {
        setMemoryKey("general");
      }
      if (!memoryContent && memory.globalMemory.length) {
        setMemoryContent(memory.globalMemory[0].content || "");
      }
    }
  }, [
    memoryScope,
    activeLead,
    marketInfo,
    memory.leadMemory,
    memory.marketMemory,
    memory.globalMemory
  ]);

  useEffect(() => {
    let active = true;
    async function loadWorkflowDetail() {
      if (!selectedWorkflowId) {
        setWorkflowDetail(null);
        return;
      }
      setWorkflowDetailLoading(true);
      try {
        const response = await fetch(`/api/workflows/${selectedWorkflowId}`);
        if (!response.ok) throw new Error("Failed to load workflow details");
        const data = await response.json();
        if (active) setWorkflowDetail(data);
      } catch (_) {
        if (active) setWorkflowDetail(null);
      } finally {
        if (active) setWorkflowDetailLoading(false);
      }
    }
    loadWorkflowDetail();
    return () => {
      active = false;
    };
  }, [selectedWorkflowId]);

  useEffect(() => {
    localStorage.setItem("propai_token", consoleToken);
  }, [consoleToken]);

  async function saveMemoryEntry() {
    if (!memoryScope || !memoryKey || !memoryContent.trim()) {
      setMemoryStatus("Scope, key, and content are required.");
      return;
    }
    setMemorySaving(true);
    setMemoryStatus("");
    try {
      const response = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: memoryScope,
          key: memoryKey,
          content: memoryContent.trim()
        })
      });
      if (!response.ok) throw new Error("Failed to save memory");
      setMemoryStatus("Memory saved.");
      setMemoryRefreshKey((value) => value + 1);
    } catch (_) {
      setMemoryStatus("Failed to save memory.");
    } finally {
      setMemorySaving(false);
    }
  }

  async function sendConsoleCommand() {
    if (!consoleInput.trim()) return;
    const userMessage = consoleInput.trim();
    setConsoleMessages((messages) => [
      ...messages,
      { role: "user", content: userMessage }
    ]);
    setConsoleInput("");
    setConsoleStatus("");
    try {
      const response = await fetch("/api/agent/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-propai-token": consoleToken
        },
        body: JSON.stringify({ message: userMessage })
      });
      const data = await response.json();
      if (!response.ok) {
        setConsoleStatus(data.error || "Command failed.");
        return;
      }
      setConsoleRole(data.role || "");
      setConsoleMessages((messages) => [
        ...messages,
        { role: "system", content: data.message || "Command executed." }
      ]);
    } catch (_) {
      setConsoleStatus("Unable to reach control API.");
    }
  }

  return (
    <div className="min-h-screen text-text">
      <div className="grid-overlay animate-glow" />
      <div className="shell-container px-6 pb-16 pt-10 lg:px-12">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-textMuted">
              PropAI Command Center
            </p>
            <h1 className="text-3xl font-semibold">
              {(marketInfo && marketInfo.city) || "Market"} Deal Operations
            </h1>
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
                  <p className="text-xs uppercase text-textMuted">Workflows</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        await fetch("/api/leads/" + activeLead.id + "/followup", {
                          method: "POST"
                        });
                      }}
                      className="rounded-full border border-border bg-panel px-3 py-2 text-xs text-text transition hover:border-accent"
                    >
                      Draft follow-up
                    </button>
                    <button
                      onClick={async () => {
                        await fetch("/api/workflows/run", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            name: "lead_followup_scan",
                            input: { followupHours: 48 }
                          })
                        });
                      }}
                      className="rounded-full border border-border bg-panel px-3 py-2 text-xs text-text transition hover:border-accent"
                    >
                      Follow-up scan
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-textMuted">
                    Follow-up drafts are stored in lead notes.
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

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm uppercase tracking-[0.3em] text-textMuted">
                Workflow Runs
              </h2>
              <span className="text-xs text-textMuted">
                Recent automation logs
              </span>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {workflowRuns.length ? (
                workflowRuns.slice(0, 6).map((run) => (
                  <button
                    type="button"
                    key={run.id}
                    onClick={() => setSelectedWorkflowId(run.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      selectedWorkflowId === run.id
                        ? "border-accent bg-panelStrong"
                        : "border-border bg-panelStrong hover:border-accent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{run.name}</p>
                        <p className="text-xs text-textMuted">
                          {formatTime(run.started_at)}
                        </p>
                      </div>
                      <span className={workflowTag(run.status)}>
                        {run.status}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-textMuted">
                  No workflow runs yet. Trigger a follow-up scan to populate.
                </p>
              )}
            </div>
            <div className="mt-5 border-t border-border pt-4 text-sm text-textMuted">
              {workflowDetailLoading && <p>Loading workflow details...</p>}
              {!workflowDetailLoading && workflowDetail && (
                <div>
                  <p className="text-xs uppercase text-textMuted">Details</p>
                  <p className="mt-2 font-semibold text-text">
                    {workflowDetail.run.name}
                  </p>
                  <p className="text-xs text-textMuted">
                    Status: {workflowDetail.run.status}
                  </p>
                  <div className="mt-3 space-y-2">
                    {(workflowDetail.steps || []).map((step) => (
                      <div
                        key={step.id}
                        className="rounded-lg border border-border bg-panel px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{step.step_name}</span>
                          <span className={workflowTag(step.status)}>
                            {step.status}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-textMuted">
                          {step.tool_name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!workflowDetailLoading && !workflowDetail && (
                <p>Select a workflow run to view steps.</p>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm uppercase tracking-[0.3em] text-textMuted">
                Memory Vault
              </h2>
              <span className="text-xs text-textMuted">
                Lead + market context
              </span>
            </div>
            <div className="mt-4 space-y-4 text-sm text-textMuted">
              <div>
                <p className="text-xs uppercase text-textMuted">Lead memory</p>
                <p className="mt-2 whitespace-pre-wrap">
                  {memory.leadMemory || "No lead memory yet."}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-textMuted">Market memory</p>
                <p className="mt-2 whitespace-pre-wrap">
                  {memory.marketMemory || "No market memory yet."}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-textMuted">Global memory</p>
                {memory.globalMemory.length ? (
                  <ul className="mt-2 space-y-2 text-xs text-textMuted">
                    {memory.globalMemory.map((entry) => (
                      <li key={`${entry.scope}-${entry.key}`}>
                        • {entry.content}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-textMuted">
                    No global memory yet.
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-xs uppercase text-textMuted">Edit memory</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-[11px] text-textMuted">Scope</label>
                  <select
                    value={memoryScope}
                    onChange={(event) => setMemoryScope(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-panelStrong p-2 text-xs text-text"
                  >
                    <option value="lead">Lead</option>
                    <option value="market">Market</option>
                    <option value="global">Global</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-textMuted">Key</label>
                  <input
                    value={memoryKey}
                    onChange={(event) => setMemoryKey(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-panelStrong p-2 text-xs text-text"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={saveMemoryEntry}
                    className="w-full rounded-full bg-accent px-3 py-2 text-xs font-semibold text-base"
                  >
                    {memorySaving ? "Saving..." : "Save memory"}
                  </button>
                </div>
              </div>
              <textarea
                value={memoryContent}
                onChange={(event) => setMemoryContent(event.target.value)}
                placeholder="Write memory note..."
                className="mt-3 h-24 w-full rounded-xl border border-border bg-panelStrong p-3 text-xs text-text outline-none focus:border-accent"
              />
              {memoryStatus && (
                <p className="mt-2 text-xs text-textMuted">{memoryStatus}</p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm uppercase tracking-[0.3em] text-textMuted">
                Agent Console
              </h2>
              <span className="text-xs text-textMuted">
                Role: {consoleRole || "unknown"}
              </span>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
              <div className="rounded-xl border border-border bg-panelStrong p-4 text-xs text-textMuted">
                <p className="text-xs uppercase text-textMuted">Access token</p>
                <input
                  value={consoleToken}
                  onChange={(event) => setConsoleToken(event.target.value)}
                  placeholder="Paste broker token"
                  className="mt-3 w-full rounded-lg border border-border bg-panel p-2 text-xs text-text"
                />
                <p className="mt-3 text-[11px] text-textMuted">
                  Tokens are set in config.local.json under auth.tokens.
                </p>
              </div>
              <div className="flex flex-col rounded-xl border border-border bg-panelStrong p-4">
                <div className="flex-1 space-y-3 overflow-y-auto text-sm">
                  {consoleMessages.length ? (
                    consoleMessages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={`console-bubble ${
                          message.role === "user"
                            ? "console-user"
                            : "console-system"
                        }`}
                      >
                        {message.content}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-textMuted">
                      Try: “Switch model to gpt-4o”, “Mark lead 3 as hot”, “Enable
                      scheduler”.
                    </p>
                  )}
                </div>
                {consoleStatus && (
                  <p className="mt-3 text-xs text-bad">{consoleStatus}</p>
                )}
                <div className="mt-4 flex gap-2">
                  <input
                    value={consoleInput}
                    onChange={(event) => setConsoleInput(event.target.value)}
                    placeholder="Type a command..."
                    className="flex-1 rounded-xl border border-border bg-panel p-3 text-sm text-text outline-none focus:border-accent"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        sendConsoleCommand();
                      }
                    }}
                  />
                  <button
                    onClick={sendConsoleCommand}
                    className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-base"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
