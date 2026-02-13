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
    urgency_score: 82,
    last_message: "Looking for a 2BHK near the metro.",
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
    urgency_score: 64,
    last_message: "Need possession this month.",
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
    urgency_score: 28,
    last_message: "Selling a 4BHK, want market guidance.",
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
  if (status === "cold") return "tag tag-cold";
  if (status === "closed") return "tag tag-closed";
  return "tag tag-new";
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
  if (!lead.contact && !lead.phone) flags.push("Contact missing");
  if (!flags.length) flags.push("No risks flagged");
  return flags;
}

function computeNextAction(lead) {
  if (!lead.contact && !lead.phone) return "Request contact details.";
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
  const [authRole, setAuthRole] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [tokensByRole, setTokensByRole] = useState({
    admin: [],
    operator: [],
    viewer: []
  });
  const [tokenStatus, setTokenStatus] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenRole, setTokenRole] = useState("operator");
  const [newTokenValue, setNewTokenValue] = useState("");
  const [logItems, setLogItems] = useState([]);
  const [logStatus, setLogStatus] = useState("");
  const [logLoading, setLogLoading] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState("");
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappState, setWhatsappState] = useState({
    enabled: false,
    running: false
  });
  const [activeSection, setActiveSection] = useState("deals");
  const [mobileDealsTab, setMobileDealsTab] = useState("leads");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadFilter, setLeadFilter] = useState("all");
  const [draftReply, setDraftReply] = useState("");
  const [qualifyPrompt, setQualifyPrompt] = useState("");
  const [quickActionStatus, setQuickActionStatus] = useState("");

  const stats = useMemo(() => {
    const hot = leads.filter((lead) => lead.status === "hot").length;
    const warm = leads.filter((lead) => lead.status === "warm").length;
    const cold = leads.filter((lead) => lead.status === "cold").length;
    const fresh = leads.filter(
      (lead) => !lead.status || lead.status === "new"
    ).length;
    const pipeline = hot + warm;
    return { hot, warm, cold, fresh, pipeline };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const search = leadSearch.trim().toLowerCase();
    return leads.filter((lead) => {
      if (leadFilter !== "all" && (lead.status || "new") !== leadFilter) {
        return false;
      }
      if (!search) return true;
      return [
        lead.lead_name,
        lead.location,
        lead.budget,
        lead.intent,
        lead.phone
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [leads, leadSearch, leadFilter]);

  const similarLeads = useMemo(() => {
    if (!activeLead || !activeLead.location) return [];
    return leads
      .filter(
        (lead) =>
          lead.id !== activeLead.id &&
          lead.location &&
          lead.location === activeLead.location
      )
      .slice(0, 3);
  }, [activeLead, leads]);

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

  useEffect(() => {
    let active = true;
    async function loadRole() {
      if (!consoleToken) {
        setAuthRole("");
        setConsoleRole("");
        setAuthStatus("");
        return;
      }
      try {
        const response = await fetch("/api/auth/me", {
          headers: { "x-propai-token": consoleToken }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unauthorized");
        if (active) {
          setAuthRole(data.role || "");
          setConsoleRole(data.role || "");
          setAuthStatus("");
        }
      } catch (_) {
        if (active) {
          setAuthRole("");
          setConsoleRole("");
          setAuthStatus("Token not recognized.");
        }
      }
    }
    loadRole();
    return () => {
      active = false;
    };
  }, [consoleToken]);

  useEffect(() => {
    if (authRole !== "admin") {
      setTokensByRole({ admin: [], operator: [], viewer: [] });
      setLogItems([]);
      return;
    }
    loadTokens();
    loadLogs();
  }, [authRole]);

  useEffect(() => {
    if (!consoleToken) {
      setWhatsappState({ enabled: false, running: false });
      return;
    }
    loadWhatsAppStatus();
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

  async function loadTokens() {
    if (!consoleToken) return;
    setTokenLoading(true);
    setTokenStatus("");
    try {
      const response = await fetch("/api/auth/tokens", {
        headers: { "x-propai-token": consoleToken }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load tokens");
      setTokensByRole(data.tokens || { admin: [], operator: [], viewer: [] });
    } catch (_) {
      setTokensByRole({ admin: [], operator: [], viewer: [] });
      setTokenStatus("Unable to load tokens.");
    } finally {
      setTokenLoading(false);
    }
  }

  async function createToken() {
    if (!consoleToken) return;
    setTokenLoading(true);
    setTokenStatus("");
    setNewTokenValue("");
    try {
      const response = await fetch("/api/auth/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-propai-token": consoleToken
        },
        body: JSON.stringify({ role: tokenRole })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create token");
      setNewTokenValue(data.token || "");
      setTokenStatus(`Created ${data.role} token.`);
      await loadTokens();
    } catch (_) {
      setTokenStatus("Failed to create token.");
    } finally {
      setTokenLoading(false);
    }
  }

  async function revokeToken(role, index) {
    if (!consoleToken) return;
    setTokenLoading(true);
    setTokenStatus("");
    try {
      const response = await fetch("/api/auth/tokens", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-propai-token": consoleToken
        },
        body: JSON.stringify({ role, index })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to revoke token");
      setTokenStatus("Token revoked.");
      await loadTokens();
    } catch (_) {
      setTokenStatus("Failed to revoke token.");
    } finally {
      setTokenLoading(false);
    }
  }

  async function loadLogs() {
    if (!consoleToken) return;
    setLogLoading(true);
    setLogStatus("");
    try {
      const response = await fetch("/api/control/logs", {
        headers: { "x-propai-token": consoleToken }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load logs");
      setLogItems(Array.isArray(data) ? data : []);
    } catch (_) {
      setLogItems([]);
      setLogStatus("Unable to load control logs.");
    } finally {
      setLogLoading(false);
    }
  }

  async function loadWhatsAppStatus() {
    try {
      const response = await fetch("/api/whatsapp/status", {
        headers: { "x-propai-token": consoleToken }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load status");
      setWhatsappState({
        enabled: Boolean(data.enabled),
        running: Boolean(data.running)
      });
    } catch (_) {
      setWhatsappState({ enabled: false, running: false });
    }
  }

  async function syncWhatsApp() {
    if (!consoleToken) {
      setWhatsappStatus("Add an operator or admin token first.");
      return;
    }
    setWhatsappLoading(true);
    setWhatsappStatus("");
    try {
      const response = await fetch("/api/whatsapp/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-propai-token": consoleToken
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start WhatsApp");
      setWhatsappStatus(
        data.status === "running"
          ? "WhatsApp is already running."
          : "WhatsApp started. Scan the QR code in the terminal."
      );
      await loadWhatsAppStatus();
    } catch (err) {
      setWhatsappStatus(err.message || "Unable to sync WhatsApp.");
    } finally {
      setWhatsappLoading(false);
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
      setConsoleRole(data.role || authRole || "");
      setConsoleMessages((messages) => [
        ...messages,
        { role: "system", content: data.message || "Command executed." }
      ]);
    } catch (_) {
      setConsoleStatus("Unable to reach control API.");
    }
  }

  async function suggestReply() {
    if (!activeLead) return;
    setQuickActionStatus("");
    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "web",
          content: `Draft a WhatsApp reply for this lead:\n${activeLead.lead_name || "Lead"}\n${activeLead.intent || ""} ${activeLead.configuration || ""} ${activeLead.location || ""}\nLast message: ${activeLead.last_message || ""}`
        })
      });
      const data = await response.json();
      setDraftReply(data.reply || "");
    } catch (_) {
      setQuickActionStatus("Unable to reach backend for suggestions.");
    }
  }

  async function qualifyLead() {
    if (!activeLead) return;
    setQuickActionStatus("");
    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "web",
          content: `Draft 2-3 qualification questions for this lead:\n${activeLead.lead_name || "Lead"}\n${activeLead.intent || ""} ${activeLead.configuration || ""} ${activeLead.location || ""}\nMissing fields: ${computeRiskFlags(activeLead).join(", ")}`
        })
      });
      const data = await response.json();
      setQualifyPrompt(data.reply || "");
    } catch (_) {
      setQuickActionStatus("Unable to reach backend for qualification.");
    }
  }

  async function scheduleFollowup() {
    if (!activeLead) return;
    setQuickActionStatus("");
    try {
      await fetch(`/api/leads/${activeLead.id}/followup`, { method: "POST" });
      setQuickActionStatus("Follow-up workflow triggered.");
    } catch (_) {
      setQuickActionStatus("Unable to trigger follow-up.");
    }
  }

  async function markLead(status) {
    if (!activeLead) return;
    if (!consoleToken) {
      setQuickActionStatus("Add a token to update lead status.");
      return;
    }
    setQuickActionStatus("");
    try {
      const response = await fetch("/api/agent/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-propai-token": consoleToken
        },
        body: JSON.stringify({
          message: `mark lead ${activeLead.id} as ${status}`
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Update failed");
      setQuickActionStatus(data.message || "Lead updated.");
    } catch (_) {
      setQuickActionStatus("Unable to update lead status.");
    }
  }

  const navItems = [
    { id: "deals", label: "Deals" },
    { id: "market", label: "Market Research" },
    { id: "analyzer", label: "Property Analyzer" },
    { id: "memory", label: "Memory Vault" },
    { id: "workflows", label: "Workflows" },
    { id: "console", label: "Agent Console" }
  ];

  const adminNavItem = { id: "admin", label: "Admin" };

  return (
    <div className="min-h-screen text-text">
      <div className="grid-overlay animate-glow" />
      <div className="shell-container flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-base/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <div className="text-xs uppercase tracking-[0.4em] text-textMuted">
                PropAI Deal Cockpit
              </div>
              <h1 className="text-2xl font-semibold">
                {(marketInfo && marketInfo.city) || "Market"} Command Center
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="status-pill">
                Hot{" "}
                <span className="text-bad">{loading ? "..." : stats.hot}</span>
              </div>
              <div className="status-pill">
                Warm{" "}
                <span className="text-warn">{loading ? "..." : stats.warm}</span>
              </div>
              <div className="status-pill">
                New{" "}
                <span className="text-accentStrong">
                  {loading ? "..." : stats.fresh}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="status-pill">
                Backend: {error ? "offline" : "online"}
              </div>
              <div className="status-pill">
                WhatsApp:{" "}
                {whatsappState.running
                  ? "running"
                  : whatsappState.enabled
                    ? "idle"
                    : "disabled"}
              </div>
              <button
                onClick={syncWhatsApp}
                className="rounded-full border border-border bg-panel px-4 py-2 text-xs text-textMuted transition hover:text-text"
                disabled={whatsappLoading}
              >
                {whatsappLoading ? "Syncing..." : "Sync WhatsApp"}
              </button>
              <button
                onClick={scheduleFollowup}
                className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-base"
              >
                New follow-up
              </button>
              <div className="status-pill">Role: {authRole || "unknown"}</div>
            </div>
          </div>
          {whatsappStatus && (
            <div className="mx-auto w-full max-w-[1400px] px-4 pb-3 text-xs text-textMuted">
              {whatsappStatus}
            </div>
          )}
        </header>

        <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-6 px-4 pb-24 pt-6 lg:pb-10">
          <aside className="hidden w-56 flex-shrink-0 lg:flex lg:flex-col">
            <div className="card p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-textMuted">
                Navigation
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`nav-item ${
                      activeSection === item.id ? "nav-item-active" : ""
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                {authRole === "admin" && (
                  <button
                    onClick={() => setActiveSection(adminNavItem.id)}
                    className={`nav-item ${
                      activeSection === adminNavItem.id
                        ? "nav-item-active"
                        : ""
                    }`}
                  >
                    {adminNavItem.label}
                  </button>
                )}
              </div>
            </div>
          </aside>

          <main className="flex-1 space-y-8">

        {activeSection === "deals" && (
          <section>
            <div className="flex flex-col gap-4 lg:hidden">
              <div className="flex gap-2">
                {[
                  { id: "leads", label: "Leads" },
                  { id: "chat", label: "Conversation" },
                  { id: "intel", label: "Intelligence" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMobileDealsTab(tab.id)}
                    className={`flex-1 rounded-full border px-3 py-2 text-xs ${
                      mobileDealsTab === tab.id
                        ? "border-accent bg-panelStrong text-text"
                        : "border-border bg-panel text-textMuted"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.2fr_0.95fr]">
              <div
                className={`${
                  mobileDealsTab === "leads" ? "block" : "hidden"
                } lg:block`}
              >
                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm uppercase tracking-[0.3em] text-textMuted">
                      Leads
                    </h2>
                    <span className="text-xs text-textMuted">
                      {filteredLeads.length} active
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <input
                      value={leadSearch}
                      onChange={(event) => setLeadSearch(event.target.value)}
                      placeholder="Search name, location, budget"
                      className="w-full rounded-xl border border-border bg-panelStrong p-3 text-xs text-text outline-none focus:border-accent"
                    />
                    <div className="flex flex-wrap gap-2 text-xs">
                      {["all", "hot", "warm", "cold", "new"].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setLeadFilter(tab)}
                          className={`rounded-full border px-3 py-1 ${
                            leadFilter === tab
                              ? "border-accent bg-panelStrong text-text"
                              : "border-border bg-panel text-textMuted"
                          }`}
                        >
                          {tab.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {filteredLeads.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => {
                          setActiveLead(lead);
                          setMobileDealsTab("chat");
                        }}
                        className={`lead-card ${
                          activeLead?.id === lead.id ? "lead-card-active" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">
                              {lead.lead_name || "Unnamed lead"}
                            </p>
                            <p className="text-xs text-textMuted">
                              {lead.location || "Unknown location"} |{" "}
                              {lead.budget || "Budget TBD"}
                            </p>
                          </div>
                          <span className={statusTag(lead.status || "new")}>
                            {lead.status || "new"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-textMuted">
                          {lead.last_message
                            ? lead.last_message.slice(0, 60)
                            : "No messages yet."}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-textMuted">
                          <span>
                            Last touch {timeSince(lead.last_message_at)}
                          </span>
                          <span className="urgency-pill">
                            Urgency {lead.urgency_score || 0}
                          </span>
                        </div>
                      </button>
                    ))}
                    {!filteredLeads.length && (
                      <p className="text-xs text-textMuted">
                        No leads match this filter.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`${
                  mobileDealsTab === "chat" ? "block" : "hidden"
                } lg:block`}
              >
                <div className="card flex flex-col p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm uppercase tracking-[0.3em] text-textMuted">
                      Conversation
                    </h2>
                    <div className="text-xs text-textMuted">
                      {activeLead ? activeLead.phone : "No lead selected"}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <button
                      onClick={suggestReply}
                      className="rounded-full border border-border bg-panel px-3 py-2 text-text transition hover:border-accent"
                    >
                      Suggest reply
                    </button>
                    <button
                      onClick={qualifyLead}
                      className="rounded-full border border-border bg-panel px-3 py-2 text-text transition hover:border-accent"
                    >
                      Qualify lead
                    </button>
                    <button
                      onClick={scheduleFollowup}
                      className="rounded-full border border-border bg-panel px-3 py-2 text-text transition hover:border-accent"
                    >
                      Schedule follow-up
                    </button>
                    <button
                      onClick={() => markLead("hot")}
                      className="rounded-full border border-border bg-panel px-3 py-2 text-text transition hover:border-accent"
                    >
                      Mark hot
                    </button>
                    <button
                      onClick={() => markLead("warm")}
                      className="rounded-full border border-border bg-panel px-3 py-2 text-text transition hover:border-accent"
                    >
                      Mark warm
                    </button>
                    <button
                      onClick={() => markLead("cold")}
                      className="rounded-full border border-border bg-panel px-3 py-2 text-text transition hover:border-accent"
                    >
                      Mark cold
                    </button>
                  </div>
                  {quickActionStatus && (
                    <p className="mt-3 text-xs text-textMuted">
                      {quickActionStatus}
                    </p>
                  )}
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
                              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
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
                        No messages yet. Start a conversation to see context
                        here.
                      </p>
                    )}
                  </div>
                  <div className="mt-6 border-t border-border pt-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-textMuted">
                      Draft reply
                    </p>
                    <textarea
                      value={draftReply}
                      onChange={(event) => setDraftReply(event.target.value)}
                      placeholder="AI reply suggestion appears here."
                      className="mt-3 h-24 w-full rounded-xl border border-border bg-panelStrong p-3 text-xs text-text outline-none focus:border-accent"
                    />
                    {qualifyPrompt && (
                      <div className="mt-4 rounded-xl border border-border bg-panelStrong p-3 text-xs text-textMuted">
                        <p className="text-[11px] uppercase text-textMuted">
                          Qualification prompts
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-text">
                          {qualifyPrompt}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`${
                  mobileDealsTab === "intel" ? "block" : "hidden"
                } lg:block`}
              >
                <div className="card p-5">
                  <h2 className="text-sm uppercase tracking-[0.3em] text-textMuted">
                    Lead Intelligence
                  </h2>
                  {activeLead ? (
                    <div className="mt-4 space-y-5 text-sm">
                      <div>
                        <p className="text-xs uppercase text-textMuted">
                          Lead summary
                        </p>
                        <p className="mt-2 font-semibold">
                          {activeLead.lead_name || "Unnamed lead"}
                        </p>
                        <p className="text-textMuted">
                          {activeLead.location || "-"} |{" "}
                          {activeLead.configuration || "-"}
                        </p>
                      </div>
                      <div className="grid gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-textMuted">Intent</span>
                          <span>{activeLead.intent || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-textMuted">Lead type</span>
                          <span>{activeLead.lead_type || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-textMuted">Budget</span>
                          <span>{activeLead.budget || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-textMuted">Timeline</span>
                          <span>{activeLead.timeline || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-textMuted">Contact</span>
                          <span>
                            {activeLead.contact || activeLead.phone || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-textMuted">Urgency</span>
                          <span>{activeLead.urgency_score || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-textMuted">Group</span>
                          <span>{activeLead.group_name || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-textMuted">Status</span>
                          <span className={statusTag(activeLead.status)}>
                            {activeLead.status || "new"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-textMuted">
                          AI insight
                        </p>
                        <p className="mt-2 text-xs text-textMuted">
                          {memory.leadMemory ||
                            "No AI insight yet. Run a qualification flow."}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-textMuted">
                          Missing qualifiers
                        </p>
                        <div className="mt-2 space-y-1 text-xs text-textMuted">
                          {computeRiskFlags(activeLead).map((flag) => (
                            <p key={flag}>- {flag}</p>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-textMuted">
                          Next action
                        </p>
                        <p className="mt-2 text-xs text-textMuted">
                          {computeNextAction(activeLead)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-textMuted">
                          Similar leads
                        </p>
                        {similarLeads.length ? (
                          <div className="mt-2 space-y-2 text-xs text-textMuted">
                            {similarLeads.map((lead) => (
                              <div
                                key={lead.id}
                                className="rounded-lg border border-border bg-panel px-3 py-2"
                              >
                                <p className="text-text">
                                  {lead.lead_name || "Lead"} |{" "}
                                  {lead.budget || "Budget TBD"}
                                </p>
                                <p className="text-[11px] text-textMuted">
                                  {lead.location || "-"} |{" "}
                                  {lead.configuration || "-"}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-textMuted">
                            No comparable leads yet.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-textMuted">
                      Select a lead to view intelligence.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeSection === "analyzer" && (
          <section className="card p-6">
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
              className="mt-4 h-44 w-full rounded-xl border border-border bg-panelStrong p-4 text-sm text-text outline-none focus:border-accent"
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
          </section>
        )}

        {activeSection === "market" && (
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm uppercase tracking-[0.3em] text-textMuted">
                Market Research
              </h2>
              <span className="text-xs text-textMuted">Search + summary</span>
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
          </section>
        )}

        {activeSection === "workflows" && (
          <section className="card p-6">
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
          </section>
        )}

        {activeSection === "memory" && (
          <section className="card p-6">
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
                        - {entry.content}
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
          </section>
        )}

        {activeSection === "console" && (
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm uppercase tracking-[0.3em] text-textMuted">
                Agent Console
              </h2>
              <span className="text-xs text-textMuted">
                Role: {authRole || consoleRole || "unknown"}
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
                {authStatus && (
                  <p className="mt-2 text-[11px] text-bad">{authStatus}</p>
                )}
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
                      Try: "Switch model to gpt-4o", "Mark lead 3 as hot",
                      "Enable scheduler".
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
        </section>
        )}

        {activeSection === "admin" && authRole === "admin" && (
          <section className="grid gap-6 xl:grid-cols-2">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm uppercase tracking-[0.3em] text-textMuted">
                  Access Control
                </h2>
                <button
                  onClick={loadTokens}
                  className="rounded-full border border-border bg-panel px-3 py-2 text-[11px] text-textMuted transition hover:text-text"
                >
                  Refresh
                </button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <select
                  value={tokenRole}
                  onChange={(event) => setTokenRole(event.target.value)}
                  className="w-full rounded-lg border border-border bg-panelStrong p-2 text-xs text-text"
                >
                  <option value="admin">Admin</option>
                  <option value="operator">Operator</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={createToken}
                  className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-base"
                  disabled={tokenLoading}
                >
                  {tokenLoading ? "Working..." : "Create token"}
                </button>
              </div>
              {newTokenValue && (
                <div className="mt-4 rounded-lg border border-border bg-panelStrong p-3 text-xs text-text">
                  <p className="text-[11px] uppercase text-textMuted">
                    New token (store securely)
                  </p>
                  <p className="mt-2 break-all">{newTokenValue}</p>
                </div>
              )}
              {tokenStatus && (
                <p className="mt-3 text-xs text-textMuted">{tokenStatus}</p>
              )}
              <div className="mt-5 space-y-4 text-xs text-textMuted">
                {["admin", "operator", "viewer"].map((roleName) => (
                  <div key={roleName}>
                    <p className="text-[11px] uppercase text-textMuted">
                      {roleName}
                    </p>
                    <div className="mt-2 space-y-2">
                      {(tokensByRole[roleName] || []).length ? (
                        tokensByRole[roleName].map((token) => (
                          <div
                            key={`${roleName}-${token.index}`}
                            className="flex items-center justify-between rounded-lg border border-border bg-panel px-3 py-2"
                          >
                            <span className="text-xs text-text">
                              {token.masked}
                            </span>
                            <button
                              onClick={() =>
                                revokeToken(roleName, token.index)
                              }
                              className="text-[11px] text-bad"
                              disabled={tokenLoading}
                            >
                              Revoke
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-textMuted">
                          No tokens yet.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm uppercase tracking-[0.3em] text-textMuted">
                  Control Logs
                </h2>
                <button
                  onClick={loadLogs}
                  className="rounded-full border border-border bg-panel px-3 py-2 text-[11px] text-textMuted transition hover:text-text"
                >
                  Refresh
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-textMuted">
                {logLoading && <p>Loading logs...</p>}
                {!logLoading && logItems.length === 0 && (
                  <p>No control actions yet.</p>
                )}
                {!logLoading &&
                  logItems.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-border bg-panelStrong px-3 py-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="uppercase text-textMuted">
                          {log.role || "unknown"}
                        </span>
                        <span className={workflowTag(log.status)}>
                          {log.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-text">
                        {log.command || "Command"}
                      </p>
                      <p className="mt-1 text-[11px] text-textMuted">
                        {log.action || "action"} | {formatTime(log.created_at)}
                      </p>
                    </div>
                  ))}
                {logStatus && (
                  <p className="text-xs text-textMuted">{logStatus}</p>
                )}
              </div>
            </div>
          </section>
        )}
          </main>
        </div>

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-base/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-2 overflow-x-auto px-4 py-3 text-xs text-textMuted">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`bottom-nav-item ${
                  activeSection === item.id ? "bottom-nav-active" : ""
                }`}
              >
                {item.label}
              </button>
            ))}
            {authRole === "admin" && (
              <button
                onClick={() => setActiveSection(adminNavItem.id)}
                className={`bottom-nav-item ${
                  activeSection === adminNavItem.id ? "bottom-nav-active" : ""
                }`}
              >
                {adminNavItem.label}
              </button>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
