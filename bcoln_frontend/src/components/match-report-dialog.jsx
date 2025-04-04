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
  const { address, signMessage } = useWeb3()
  const [winner, setWinner] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!match) return null

  const handleSubmit = async () => {
    if (!winner) return

    setIsSubmitting(true)

    try {
      // In the real app, we would:
      // 1. Create a message with the match details and winner
      // 2. Sign this message with the user's wallet
      // 3. Submit the signed message to the smart contract

      const message = `I confirm that the winner of match ${match.id} is ${winner}`
      const signature = await signMessage(message)

      console.log("Signed message:", { message, signature })

      // Submit the result
      onSubmit({ winner })
    } catch (error) {
      console.error("Error signing message:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isPlayer = match.player1 === address || match.player2 === address
  const opponent = match.player1 === address ? match.player2 : match.player1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Match Result</DialogTitle>
          <DialogDescription>
            Both players must submit and sign the same result for it to be recorded on the blockchain.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4 text-sm">
            <p>
              Match ID: <span className="font-mono">{match.id}</span>
            </p>
            <p className="mt-1">
              Opponent: <span className="font-mono">{opponent}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="font-medium text-sm">Select the winner:</div>
            <RadioGroup value={winner || ""} onValueChange={setWinner}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={match.player1} id="player1" />
                <Label htmlFor="player1" className="font-mono text-xs">
                  {match.player1 === address ? `${match.player1} (You)` : match.player1}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={match.player2} id="player2" />
                <Label htmlFor="player2" className="font-mono text-xs">
                  {match.player2 === address ? `${match.player2} (You)` : match.player2}
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!winner || isSubmitting}>
            {isSubmitting ? "Signing..." : "Sign & Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

