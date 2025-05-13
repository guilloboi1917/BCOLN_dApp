const MATCH_HISTORY_KEY = "match_history";

export function getStoredMatchHistory() {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(MATCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
}

export function addMatchToHistory(match) {
    if (typeof window === "undefined") return;

    const history = getStoredMatchHistory();
    const exists = history.some((m) => m.id === match.id);
    if (!exists) {
        const updated = [match, ...history];
        localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(updated));
    }
}
  
export function getPaginatedMatchHistory(page = 1, pageSize = 5, customList = null) {
    const all = customList ?? getStoredMatchHistory();
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      total: all.length,
      data: all.slice(start, end),
    };
  }  
  
export function clearMatchHistory() {
    localStorage.removeItem(MATCH_HISTORY_KEY);
}


