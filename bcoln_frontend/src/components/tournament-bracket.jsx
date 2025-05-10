"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"

export function TournamentBracket({ tournament }) {
  const [rounds, setRounds] = useState([])

  useEffect(() => {
    const matchesNested = tournament.matches;
    console.log("matches", matchesNested)
    if (!matchesNested) return;

    const groupedRounds = matchesNested.map((matches, index) => {
      const roundMatches = matches.length > 0 ? matches : Array(Math.pow(2, Number(tournament.totalRounds) - index - 1)).fill(null);

      return {
        round: index + 1,
        name:
          index === matchesNested.length - 1
            ? "Final"
            : index === matchesNested.length - 2
            ? "Semi-Finals"
            : index === matchesNested.length - 3
            ? "Quarter-Finals"
            : `Round ${index + 1}`,
        matches: roundMatches.map((match, i) => ({
          id: match ? `${match.matchAddress}-${i}` : `placeholder-${i}`,
          player1: match ? match.player1 : "TBD",   // Use "TBD" if no match
          player2: match ? match.player2 : "TBD",   // Use "TBD" if no match
          winner: match ? match.winner : "TBD",     // Use "TBD" if no winner
          status: match ? match.status : "Pending", // Use "Pending" if match is not set
        })),
      };
    });

    setRounds(groupedRounds);
  }, [tournament]);

  if (rounds.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-muted-foreground">Loading bracket...</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 min-w-[800px] p-2">
        {rounds.map((round) => (
          <div key={round.round} className="flex-1">
            <h3 className="text-sm font-medium mb-3 text-center">{round.name}</h3>
            <div className="space-y-4">
              {round.matches.map((match) => (
                <Card key={match.id} className="p-3 text-xs">
                  <div className="space-y-2">
                    <div
                      className={`p-2 rounded ${match.winner !== "TBD" && match.winner === match.player1 ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}
                    >
                      <div className="truncate">{match.player1}</div>
                    </div>
                    <div
                      className={`p-2 rounded ${match.winner !== "TBD" && match.winner === match.player2 ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}
                    >
                      <div className="truncate">{match.player2}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
