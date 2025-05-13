"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export function JuryVoteDialog({ open, onOpenChange, match, onSubmit }) {
  const [winner, setWinner] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!match) return null;

  const handleSubmit = async () => {
    if (!winner) return;
    setIsSubmitting(true);

    try {
      await onSubmit(winner); // Just pass the number (1 or 2)
    } catch (error) {
      console.error("Error submitting vote:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vote On Match Dispute</DialogTitle>
          <DialogDescription>
            Vote on who won the match truthfully.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            <div className="font-medium text-sm">Select the winner:</div>
            <RadioGroup
              value={winner ? winner.toString() : ""}
              onValueChange={(val) => setWinner(Number(val))}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1" id="player-1" />
                <Label htmlFor="player-1" className="font-mono text-xs">
                  Player 1: {match.player1}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2" id="player-2" />
                <Label htmlFor="player-2" className="font-mono text-xs">
                  Player 2: {match.player2}
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
            {isSubmitting ? "Submitting..." : "Submit Vote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
