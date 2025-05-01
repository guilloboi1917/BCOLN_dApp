"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"

export function TournamentBracket({ tournament }) {
  const [rounds, setRounds] = useState([])

  useEffect(() => {
    const maxParticipants = tournament.maxParticipants;
    const numRounds = Math.log2(maxParticipants);
    const groupedRounds = [];
  
    for (let round = 1; round <= numRounds; round++) {
      const expectedMatches = maxParticipants / Math.pow(2, round);
      const realMatches = tournament.matches.filter((m) => m.round === round);
      const filledMatches = [];
  
      for (let i = 0; i < expectedMatches; i++) {
        const match = realMatches[i];
  
        if (match) {
          filledMatches.push(match);
        } else {
          filledMatches.push({
            id: `placeholder-${round}-${i}`,
            round,
            player1: null,
            player2: null,
            winner: null,
            status: "pending",
          });
        }
      }
  
      groupedRounds.push({
        round,
        name:
          round === numRounds
            ? "Final"
            : round === numRounds - 1
            ? "Semi-Finals"
            : round === numRounds - 2
            ? "Quarter-Finals"
            : `Round ${round}`,
        matches: filledMatches,
      });
    }
  
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
              {round.matches.map((match, index) => (
                <Card key={match.id} className="p-3 text-xs">
                  <div className="space-y-2">
                    <div
                      className={`p-2 rounded ${match.winner && match.winner === match.player1 ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}
                    >
                      {match.player1 ? (
                        <div className="truncate">{match.player1}</div>
                      ) : (
                        <div className="text-muted-foreground italic">TBD</div>
                      )}
                    </div>
                    <div
                      className={`p-2 rounded ${match.winner && match.winner === match.player2 ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}
                    >
                      {match.player2 ? (
                        <div className="truncate">{match.player2}</div>
                      ) : (
                        <div className="text-muted-foreground italic">TBD</div>
                      )}
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

