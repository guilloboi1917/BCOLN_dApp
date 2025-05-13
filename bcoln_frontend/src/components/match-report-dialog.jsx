"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useWeb3 } from "@/hooks/use-web3"

export function MatchReportDialog({ open, onOpenChange, match, onSubmit }) {
  const { address } = useWeb3()
  const [winner, setWinner] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!match) return null

  const handleSubmit = async () => {
    if (!winner) return;
    setIsSubmitting(true);
  
    try {
      await onSubmit({ winner, match }); // 👈 await here
    } catch (error) {
      console.error("Error submitting match result:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  

  const isPlayer = match.player1 === address || match.player2 === address
  const opponent = match.player1 === address ? match.player2 : match.player1

  const options = [match.player1, match.player2]
  const sortedOptions = options.sort((a, b) =>
    a.toLowerCase() === address?.toLowerCase() ? -1 : 1
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Match Result</DialogTitle>
          <DialogDescription>
            Both players must submit the same winner for the match to be resolved.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4 text-sm">
            <p>
              Opponent: <span className="font-mono">{opponent}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="font-medium text-sm">Select the winner:</div>
            <RadioGroup value={winner || ""} onValueChange={setWinner}>
              {sortedOptions.map((player, idx) => (
                <div className="flex items-center space-x-2" key={idx}>
                  <RadioGroupItem value={player} id={`player-${idx}`} />
                  <Label htmlFor={`player-${idx}`} className="font-mono text-xs">
                    {player}
                    {player.toLowerCase() === address?.toLowerCase() ? " (You)" : ""}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!winner || isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
