"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMatchDisplayStatus, getStatusString } from "@/lib/status";
import { toast } from "sonner";
import { hasSubmitted } from "@/lib/submissions";

export function MatchCard({
  match,
  address,
  joiningMatchAddress,
  onJoinMatch,
  onReportMatch,
}) {
  const hasSubmittedResult =
  typeof window !== "undefined" && match?.matchAddress && address
    ? hasSubmitted(match.matchAddress, address)
    : false;


  const numericStatus = Number(match.status);
  const statusString = getStatusString(numericStatus);

  const isUserParticipant = address
    ? match.player1?.toLowerCase() === address.toLowerCase() ||
      match.player2?.toLowerCase() === address.toLowerCase()
    : false;

  const winnerKnown =
    match.winner !== "0x0000000000000000000000000000000000000000";

  const isPlayer1 = match.player1?.toLowerCase() === address?.toLowerCase();
  const isPlayer2 = match.player2?.toLowerCase() === address?.toLowerCase();
  const hasNotJoined =
    (isPlayer1 && !match.player1Joined) ||
    (isPlayer2 && !match.player2Joined);

  return (
    <div className="border rounded-xl p-4 shadow-sm bg-muted/20">
      {/* Top Row: Status */}
      <div className="flex justify-between items-center mb-2">
        <Badge
          className={`text-xs ${
            statusString === "pending"
              ? "bg-orange-500"
              : statusString === "commit"
              ? "bg-yellow-500"
              : statusString === "reveal"
              ? "bg-blue-500"
              : statusString === "dispute"
              ? "bg-red-500"
              : statusString === "completed"
              ? "bg-green-500"
              : "bg-gray-400"
          } text-white`}
        >
          {getMatchDisplayStatus(statusString)}
        </Badge>
      </div>

      {/* Middle Row: Players */}
      <div className="flex justify-between items-center flex-wrap gap-2 mb-3">
        <div className="flex-1 font-mono text-sm text-muted-foreground truncate">
          {match.player1}
        </div>
        <span className="text-xs text-muted-foreground">vs</span>
        <div className="flex-1 text-right font-mono text-sm text-muted-foreground truncate">
          {match.player2}
        </div>
      </div>

      {/* Bottom Row: Actions & Info */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        {isUserParticipant ? (
          <div className="text-sm text-muted-foreground italic flex-1">
            {winnerKnown ? (
              <>
                Winner:{" "}
                <span className="font-semibold text-foreground">
                  {match.winner}
                </span>
              </>
            ) : numericStatus === 0 ? (
              hasNotJoined
                ? "You haven't joined the match."
                : "Waiting for opponent to join."
            ) : numericStatus === 1 ? (
              hasSubmittedResult
                ? "You’ve submitted your result. Waiting for opponent."
                : "Match started. Waiting for result submission."
            ) : numericStatus === 2 ? (
              "Result hasn't been revealed yet."
            ) : numericStatus === 3 ? (
              "Match in dispute."
            ) : null}
          </div>
        ) : (
          winnerKnown && (
            <div className="text-sm text-muted-foreground italic flex-1">
              Winner:{" "}
              <span className="font-semibold text-foreground">
                {match.winner}
              </span>
            </div>
          )
        )}

        <div className="flex gap-2">
          {numericStatus === 0 && isUserParticipant && hasNotJoined && (
            <Button
              size="sm"
              variant="default"
              disabled={joiningMatchAddress === match.matchAddress}
              onClick={() => onJoinMatch(match)}
            >
              {joiningMatchAddress === match.matchAddress
                ? "Joining..."
                : "Join Match"}
            </Button>
          )}

          {isUserParticipant &&
            [1, 2].includes(numericStatus) &&
            !hasSubmittedResult && (
              <Button
                size="sm"
                variant="default"
                onClick={() => onReportMatch(match)}
              >
                Report Match Result
              </Button>
            )}

          {statusString === "dispute" && (
            <Button
              size="sm"
              variant="default"
              onClick={() =>
                toast.info("Jury functionality can be found on Jury Page")
              }
            >
              Resolve as Juror
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
