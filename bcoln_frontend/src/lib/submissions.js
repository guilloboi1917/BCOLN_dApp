export function getMatchSubmissionKey(matchAddress, userAddress) {
    if (!matchAddress || !userAddress) return null;
    return `${matchAddress.toLowerCase()}-${userAddress.toLowerCase()}-submitted`;
}
  
export function markResultSubmitted(matchAddress, userAddress) {
    const key = getMatchSubmissionKey(matchAddress, userAddress);
    localStorage.setItem(key, "true");
}
  
export function hasSubmitted(matchAddress, userAddress) {
    const key = getMatchSubmissionKey(matchAddress, userAddress);
    if (!key) return false; // fallback
    return localStorage.getItem(key) === "true";
}
  
export function clearAllSubmissionsForAddress(userAddress) {
    const keysToRemove = [];
    for (const key in localStorage) {
        if (key.endsWith(`-${userAddress.toLowerCase()}-submitted`)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
}
  