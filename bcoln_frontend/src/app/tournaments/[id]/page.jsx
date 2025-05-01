"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TournamentBracket } from "@/components/tournament-bracket";
import { ParticipantsList } from "@/components/participants-list";
import { MatchReportDialog } from "@/components/match-report-dialog";
import { toast } from "sonner";
import { useWeb3 } from "@/hooks/use-web3";
import {
  Calendar,
  Trophy,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function TournamentDetailsPage() {
  const { id } = useParams();
  const { connected, address, joinTournament } = useWeb3();
  const [isJoining, setIsJoining] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [matchReportOpen, setMatchReportOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    // Mock API call to fetch tournament details
    const fetchTournament = async () => {
      setIsLoading(true);
      try {
        // In a real app, this would be an API call to your backend or directly to the blockchain
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Mock data
        setTournament({
          id,
          title: "Crypto Masters 2025",
          description:
            "The biggest blockchain gaming tournament of the year. Compete against the best players from around the world in this prestigious event.",
          entryFee: "0.05 ETH",
          prize: "10 ETH",
          maxParticipants: 8,
          currentParticipants: 8,
          startDate: "May 15, 2025",
          registrationDeadline: "May 10, 2025",
          status: "open",
          organizer: "0x1234...5678",
          participants: Array(8)
            .fill(0)
            .map((_, i) => ({
              address: `0x${Math.random()
                .toString(16)
                .substring(2, 10)}...${Math.random()
                .toString(16)
                .substring(2, 6)}`,
              joinedAt: new Date(
                Date.now() - Math.random() * 10000000000
              ).toISOString(),
            })),
          matches: [
            {
              id: "m1",
              round: 1,
              player1: "0x1234...5678",
              player2: "0x5678...9012",
              winner: null,
              status: "scheduled",
              scheduledTime: "May 15, 2025, 12:00 PM",
              resolutionDeadline: "May 17, 2025, 12:00 PM",
              juryDecision: null,
            },
            {
              id: "m2",
              round: 1,
              player1: "0x2345...6789",
              player2: "0x6789...0123",
              winner: "0x2345...6789",
              status: "disputed",
              scheduledTime: "May 15, 2025, 1:00 PM",
              resolutionDeadline: "May 17, 2025, 12:00 PM",
              juryDecision: "0x2345...6789", // winner's address if resolved by jury
            },
          ],
        });
      } catch (error) {
        console.error("Error fetching tournament:", error);
        toast.error("Error loading tournament", {
          description: "Could not load tournament details. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournament();
  }, [id]);

  const handleJoinTournament = async () => {
    if (!connected) {
      toast.info("Wallet not connected", {
        description: "Please connect your wallet to join this tournament",
      });
      return;
    }

    setIsJoining(true);
    try {
      // This would call the actual contract method in a real implementation
      await joinTournament(id, tournament.entryFee);

      toast.success("Successfully joined!", {
        description: "You have successfully joined the tournament",
      });

      // Update the tournament state to reflect the new participant
      setTournament((prev) => ({
        ...prev,
        currentParticipants: prev.currentParticipants + 1,
        participants: [
          ...prev.participants,
          {
            address: address,
            joinedAt: new Date().toISOString(),
          },
        ],
      }));
    } catch (error) {
      console.error("Error joining tournament:", error);
      toast.error("Error joining tournament", {
        description:
          "There was an error joining the tournament. Please try again.",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleReportMatch = (match) => {
    setSelectedMatch(match);
    setMatchReportOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Loading tournament details...
          </p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold mt-4">Tournament Not Found</h2>
          <p className="text-muted-foreground mt-2">
            The tournament you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild className="mt-6">
            <Link href="/tournaments">Browse Tournaments</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isParticipant = tournament.participants.some(
    (p) => p.address === address
  );
  const isFull = tournament.currentParticipants >= tournament.maxParticipants;
  const canJoin =
    !isParticipant && !isFull && tournament.status === "open" && connected;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold">{tournament.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge
              variant={
                tournament.status === "open"
                  ? "default"
                  : tournament.status === "active"
                  ? "outline"
                  : "secondary"
              }
            >
              {tournament.status === "open"
                ? "Open for Entry"
                : tournament.status === "active"
                ? "Active"
                : "Completed"}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Trophy className="h-3 w-3" />
              {tournament.prize}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {tournament.currentParticipants}/{tournament.maxParticipants}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {canJoin && (
            <Button onClick={handleJoinTournament} disabled={isJoining}>
              {isJoining
                ? "Joining..."
                : `Join Tournament (${tournament.entryFee})`}
            </Button>
          )}
          {isParticipant && tournament.status === "active" && (
            <Button variant="outline" onClick={() => setMatchReportOpen(true)}>
              Report Match Result
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/tournaments">Back to Tournaments</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tournament Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              {tournament.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Start Date</p>
                  <p className="text-sm text-muted-foreground">
                    {tournament.startDate}
                  </p>
                </div>
              </div>
              {/* 
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Registration Deadline</p>
                  <p className="text-sm text-muted-foreground">{tournament.registrationDeadline}</p>
                </div>
              </div> */}

              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Prize Pool</p>
                  <p className="text-sm text-muted-foreground">
                    {tournament.prize}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Participants</p>
                  <p className="text-sm text-muted-foreground">
                    {tournament.currentParticipants} /{" "}
                    {tournament.maxParticipants}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tournament Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Registration</span>
                <Badge
                  variant={
                    tournament.status === "open" ? "default" : "secondary"
                  }
                >
                  {tournament.status === "open" ? "Open" : "Closed"}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Entry Fee</span>
                <span className="font-medium">{tournament.entryFee}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Organizer</span>
                <span className="font-medium text-xs truncate max-w-[150px]">
                  {tournament.organizer}
                </span>
              </div>

              {isParticipant && (
                <div className="mt-6 p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">
                      You are registered
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    You'll be notified when matches are scheduled
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bracket" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bracket">Tournament Bracket</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
        </TabsList>

        <TabsContent value="bracket" className="mt-6 min-h-150">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Bracket</CardTitle>
              <CardDescription>
                View the current state of the tournament and upcoming matches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TournamentBracket tournament={tournament} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants" className="mt-6 min-h-150">
          <Card>
            <CardHeader>
              <CardTitle>Participants</CardTitle>
              <CardDescription>
                {tournament.currentParticipants} out of{" "}
                {tournament.maxParticipants} spots filled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ParticipantsList participants={tournament.participants} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="mt-6 min-h-150">
          <Card>
            <CardHeader>
              <CardTitle>Matches</CardTitle>
              <CardDescription>
                View scheduled, disputed, and completed matches
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tournament.matches.length > 0 ? (
                <div className="space-y-4">
                  {tournament.matches.map((match) => {
                    const isUserParticipant =
                      isParticipant &&
                      (match.player1 === address || match.player2 === address);

                    const userIsJury = true; // Replace this with actual jury check

                    return (
                      <div key={match.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">
                            Round {match.round}
                          </span>
                          {match.status === "completed" && (
                            <Badge
                              variant="outline"
                              className="bg-green-100 text-green-800"
                            >
                              Completed
                            </Badge>
                          )}
                          {match.status === "pending" && (
                            <Badge
                              variant="outline"
                              className="bg-yellow-100 text-yellow-800"
                            >
                              Pending Confirmation
                            </Badge>
                          )}
                          {match.status === "disputed" && (
                            <Badge
                              variant="outline"
                              className="bg-red-100 text-red-800"
                            >
                              Disputed
                            </Badge>
                          )}
                          {match.status === "resolved" && (
                            <Badge
                              variant="outline"
                              className="bg-purple-100 text-purple-800"
                            >
                              Resolved by Jury
                            </Badge>
                          )}
                          {match.status === "scheduled" && (
                            <Badge
                              variant="outline"
                              className="bg-blue-100 text-blue-800"
                            >
                              Scheduled
                            </Badge>
                          )}
                        </div>

                        <div className="flex justify-between items-center py-2">
                          <div className="text-sm truncate max-w-[40%]">
                            {match.player1}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            vs
                          </div>
                          <div className="text-sm truncate max-w-[40%] text-right">
                            {match.player2}
                          </div>
                        </div>

                        {match.winner && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            Winner:{" "}
                            <span className="font-medium">{match.winner}</span>
                            {match.status === "resolved" && (
                              <span className="ml-2 text-xs text-purple-600">
                                (Jury Decision)
                              </span>
                            )}
                          </div>
                        )}

                        {match.status === "pending" &&
                          match.resolutionDeadline && (
                            <div className="mt-1 text-xs text-yellow-600">
                              Awaiting confirmation until{" "}
                              {new Date(
                                match.resolutionDeadline
                              ).toLocaleString()}
                            </div>
                          )}

                        <div className="mt-3 flex justify-between items-center">
                          <div className="text-xs text-muted-foreground">
                            {match.scheduledTime}
                          </div>

                          {isUserParticipant &&
                            match.status === "scheduled" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReportMatch(match)}
                              >
                                Report Result
                              </Button>
                            )}

                          {isUserParticipant && match.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReportMatch(match)}
                            >
                              Confirm Result
                            </Button>
                          )}

                          {match.status === "disputed" && userIsJury && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                // Jury decision handler logic here
                              }}
                            >
                              Resolve Match
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No matches scheduled yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MatchReportDialog
        open={matchReportOpen}
        onOpenChange={setMatchReportOpen}
        match={selectedMatch}
        onSubmit={(result) => {
          console.log("Match result submitted:", result);
          toast.success("Result submitted", {
            description:
              "Your match result has been submitted and is awaiting confirmation",
          });
          setMatchReportOpen(false);
        }}
      />
    </div>
  );
}
