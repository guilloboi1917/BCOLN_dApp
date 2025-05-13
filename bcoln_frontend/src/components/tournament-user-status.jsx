"use client";

import { Trophy, AlertCircle, CodeSquare, CheckCircle2 } from "lucide-react";

export function TournamentUserStatus({ tournament, address }) {
if (!tournament || !address) return null;

const userAddress = address.toLowerCase();

// Only use string values from mapStatus()
const tournamentStarted =
tournament.status === "active" || tournament.status === "completed";

const allMatches = tournament._matches ?? [];

const myMatches = allMatches.filter(
(m) =>
    m.player1?.toLowerCase() === userAddress ||
    m.player2?.toLowerCase() === userAddress
);

const isCompletedStatus = (s) => {
try {
    return BigInt(s) === 4n; // 4 = completed
} catch {
    return false;
}
};

const lostMatch = myMatches.find(
(m) =>
    isCompletedStatus(m.status) &&
    m.winner &&
    m.winner.toLowerCase() !== userAddress
);

const wonFinalMatch = myMatches.find(
(m) =>
    isCompletedStatus(m.status) &&
    BigInt(m.roundNumber) === BigInt(tournament.totalRounds) &&
    m.winner &&
    m.winner.toLowerCase() === userAddress
);

console.log("🏁 FINAL DEBUG CHECK");
console.log("User Address:", userAddress);
console.log("Tournament Total Rounds:", tournament.totalRounds);
console.log("All My Matches:", myMatches.map((m) => ({
roundNumber: m.roundNumber,
status: m.status,
winner: m.winner,
isCompleted: isCompletedStatus(m.status),
isFinal: BigInt(m.roundNumber) === BigInt(tournament.totalRounds),
isUserWinner: m.winner?.toLowerCase() === userAddress
})));


if (wonFinalMatch) {
    return (
        <div className="mt-6 p-3 bg-muted rounded-md">
        <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">
                Congratulations! You won the tournament.
            </span>
        </div>
        </div>
    );
}

if (tournamentStarted && lostMatch) {
    return (
        <div className="mt-6 p-3 bg-muted rounded-md">
        <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">
                You have been eliminated from the tournament.
            </span>
        </div>
        </div>
    );
}

if (tournamentStarted) {
    return (
        <div className="mt-6 p-3 bg-muted rounded-md">
        <div className="flex items-center gap-2">
            <CodeSquare className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">
            You are progressing in the tournament.
            </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
            Keep an eye out for your upcoming matches.
        </p>
        </div>
    );
}

return (
    <div className="mt-6 p-3 bg-muted rounded-md">
        <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span className="text-sm font-medium">You are registered</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
        You'll be notified when the tournament begins.
        </p>
    </div>
    );
}
