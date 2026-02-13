async function searchWeb(query, config) {
  if (!query) throw new Error("Missing search query");
  const provider = (config.search && config.search.provider) || "serper";
  const apiKey = config.search && config.search.apiKey;
  const cx = config.search && config.search.cx;

  if (!apiKey) throw new Error("Missing search API key.");

  if (provider === "serper") {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey
      },
      body: JSON.stringify({ q: query })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error("Serper search error");
    }
    const items = data.organic || [];
    return items.slice(0, 5).map((item) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet
    }));
  }

  if (provider === "google_cse") {
    if (!cx) throw new Error("Missing Google CSE cx value.");
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw new Error("Google CSE search error");
    }
    const items = data.items || [];
    return items.slice(0, 5).map((item) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet
    }));
  }

  throw new Error(`Unsupported search provider: ${provider}`);
}

module.exports = {
  searchWeb
};
