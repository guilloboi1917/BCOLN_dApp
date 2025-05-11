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
import { ethers } from "ethers";

import TournamentContractData from "../../../../lib/contracts/TournamentContract.json";

export default function TournamentDetailsPage() {
  const { id } = useParams();
  const { connected, address, joinTournament } = useWeb3();
  const [isJoining, setIsJoining] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTournament = async () => {
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        TournamentContractData.address,
        TournamentContractData.abi,
        await provider.getSigner()
      );

      console.log("ID", id);

      const [
        name,
        description,
        entryFee,
        maxParticipants,
        registeredParticipants,
        startTime,
        status,
        currentRound,
        totalRounds,
        totalPrize
      ] = await contract.getTournamentDetails(id);
      
      const participants = await contract.getTournamentParticipants(id);
      const [bracketTotalRounds, bracketCurrentRound, matches] = await contract.getTournamentBracket(id);
      

      const parsedTournament = {
        title: name,
        description,
        entryFee: ethers.formatEther(entryFee),
        prize: ethers.formatEther(totalPrize),
        maxParticipants: Number(maxParticipants),
        registeredParticipants: Number(registeredParticipants),   
        participantList: participants,
        startDate: new Date(Number(startTime) * 1000).toLocaleDateString(),
        status: mapStatus(status),
        currentRound,
        totalRounds,
        totalPrize: ethers.formatEther(totalPrize),
        matches
      };

      console.log("LIST", parsedTournament.participantList);

      // const parsedTournament = {
      //   id: tournamentData.id.toString(),
      //   title: tournamentData.name,
      //   description: tournamentData.description,
      //   entryFee: ethers.formatEther(tournamentData.entryFee),
      //   prize: ethers.formatEther(tournamentData.totalPrize),
      //   participants: tournamentData.maxParticipants,
      //   currentParticipants: tournamentData.currentParticipants.toString(),
      //   startDate: new Date(Number(tournamentData.startTime) * 1000).toLocaleDateString(),
      //   status: mapStatus(tournamentData.status),
      //   participants: tournamentData.participants.map((p) => ({
      //     address: p.address,
      //     joinedAt: new Date(Number(p.joinedAt) * 1000).toLocaleDateString(),
      //   })),
      //   matches: tournamentData.matches || [],
      // };

      setTournament(parsedTournament);
      setTournament((prev) => ({ ...parsedTournament }));

    } catch (error) {
      console.error("Error fetching tournament:", error);
      toast.error("Error loading tournament", {
        description: "Could not load tournament details. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTournament();
  }, [id]);

  const mapStatus = (statusId) => {
    return ["open", "active", "completed", "cancelled"][statusId] || "unknown";
  };

  const handleJoinTournament = async () => {
    if (!connected) {
      toast.info("Wallet not connected", {
        description: "Please connect your wallet to join this tournament",
      });
      return;
    }

    setIsJoining(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        TournamentContractData.address,
        TournamentContractData.abi,
        await provider.getSigner()
      );

      const tx = await contract.registerForTournament(id, {
        value: ethers.parseEther(tournament.entryFee),
      });
      
      toast.success("Transaction submitted!", {
        description: "Waiting for confirmation...",
      });
      
      await tx.wait(); // wait until the tx is mined on-chain
      
      toast.success("Successfully joined!", {
        description: "You have successfully joined the tournament",
      });
      
      await fetchTournament(); // fetch updated data      

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

  // const isParticipant = tournament.registeredParticipants.some(
  //   (p) => p.address.toLowerCase() === address.toLowerCase()  // Case-insensitive check
  // );
  // const isFull = tournament.registeredParticipants.length >= tournament.maxParticipants;
  // const canJoin =
  //   !isParticipant && !isFull && tournament.status === "open" && connected;

  const isParticipant = false;
  const isFull = false;
  const canJoin = true;

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
              {tournament.registeredParticipants}/{tournament.maxParticipants}
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
                    {tournament.registeredParticipants} /{" "}
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
              {/* <TournamentBracket tournament={tournament} /> */}
              <TournamentBracket
                tournament={{
                  maxParticipants: tournament.maxParticipants,
                  totalRounds: tournament.totalRounds,
                  currentRound: tournament.currentRound,
                  matches: tournament.matches,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants" className="mt-6 min-h-150">
          <Card>
            <CardHeader>
              <CardTitle>Participants</CardTitle>
              <CardDescription>
                {tournament.registeredParticipants} out of{" "}
                {tournament.maxParticipants} spots filled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ParticipantsList participants={tournament.participantList} />
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
            {/* <CardContent>
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
            </CardContent> */}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
