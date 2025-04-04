"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"

export function TournamentBracket({ tournament }) {
  const [rounds, setRounds] = useState([])

  useEffect(() => {
    // In the real app, this would be calculated based on the tournament data
    // For now, we'll create a mock bracket
    const maxParticipants = tournament.maxParticipants
    const numRounds = Math.log2(maxParticipants)

    const mockRounds = []

    for (let i = 1; i <= numRounds; i++) {
      const numMatches = maxParticipants / Math.pow(2, i)
      const matches = []

      for (let j = 0; j < numMatches; j++) {
        // Find if there's a real match for this position
        const realMatch = tournament.matches.find((m) => m.round === i && j === Math.floor(j / 2))

        if (realMatch) {
          matches.push(realMatch)
        } else {
          matches.push({
            id: `mock-${i}-${j}`,
            round: i,
            player1: i === 1 && j < tournament.currentParticipants / 2 ? tournament.participants[j * 2]?.address : null,
            player2:
              i === 1 && j < tournament.currentParticipants / 2 ? tournament.participants[j * 2 + 1]?.address : null,
            winner: null,
            status: "pending",
          })
        }
      }

      mockRounds.push({
        round: i,
        name:
          i === numRounds
            ? "Final"
            : i === numRounds - 1
              ? "Semi-Finals"
              : i === numRounds - 2
                ? "Quarter-Finals"
                : `Round ${i}`,
        matches,
      })
    }

    setRounds(mockRounds)
  }, [tournament])

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
                      className={`p-2 rounded ${match.winner === match.player1 ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}
                    >
                      {match.player1 ? (
                        <div className="truncate">{match.player1}</div>
                      ) : (
                        <div className="text-muted-foreground italic">TBD</div>
                      )}
                    </div>
                    <div
                      className={`p-2 rounded ${match.winner === match.player2 ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}
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

