export function mapStatus(statusId) {
    return ["open", "active", "completed", "cancelled"][statusId] || "unknown";
}
  
export function getMatchDisplayStatus(status) {
    if (["pending", "commit", "reveal"].includes(status)) return "Pending";
    if (status === "dispute") return "Disputed";
    if (status === "completed") return "Completed";
    return "Unknown";
}
  
export function getStatusString(numericStatus) {
    const statusLabels = ["pending", "commit", "reveal", "dispute", "completed"];
    return statusLabels[numericStatus] ?? "unknown";
}
  