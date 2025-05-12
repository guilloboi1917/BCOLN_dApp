export function parseMatch(match) {
    return {
        matchAddress: match[0],
        tournamentId: match[1],
        player1: match[2],
        player2: match[3],
        winner: match[4],
        roundNumber: Number(match[5]),
        matchIndex: match[6],
        player1Joined: match[7],
        player2Joined: match[8],
        status: match[9],
    };
  }

export function groupMatchesByRound(matches, totalRounds) {
    const grouped = Array.from({ length: Number(totalRounds) }, () => []);

    for (const match of matches) {
        const parsed = parseMatch(match);
        if (parsed.roundNumber > 0 && parsed.roundNumber <= totalRounds) {
            grouped[parsed.roundNumber - 1].push(parsed);
        }
    }

    return grouped;
}
  