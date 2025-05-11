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

const MATCH_STATUS = {
  SCHEDULED: "scheduled",
  PENDING: "pending",
  COMPLETED: "completed",
  DISPUTED: "disputed",
  RESOLVED: "resolved",
};

export default function TournamentDetailsPage() {
  const { id } = useParams();
  const { connected, address, joinTournament } = useWeb3();
  const [isJoining, setIsJoining] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [tournamentMatches, setTournamentMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);


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
      const allMatches = await contract.getAllTournamentMatches(id);
      const groupedMatches = Array.from({ length: Number(totalRounds) }, () => []);

      Array.from(allMatches).forEach((match) => {
        if (Number(match.roundNumber) > 0 && Number(match.roundNumber) <= totalRounds) {
          groupedMatches[Number(match.roundNumber) - 1].push(match);
        }        
      });

      setTournamentMatches(groupedMatches);

      const parsedTournament = {
        title: name,
        description,
        entryFee: ethers.formatEther(entryFee),
        prize: ethers.formatEther(totalPrize),
        maxParticipants: Number(maxParticipants),
        registeredParticipants: Number(registeredParticipants),   
        participantList: Array.from(participants).map((address) => ({
          address
        })),
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

  const handleStartTournament = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        TournamentContractData.address,
        TournamentContractData.abi,
        await provider.getSigner()
      );
  
      const tx = await contract.startTournament(id);
      toast.success("Tournament starting...", {
        description: "Waiting for confirmation...",
      });
  
      await tx.wait();
      toast.success("Tournament started!");
      await fetchTournament();
    } catch (error) {
      console.error("Error starting tournament:", error);
      toast.error("Failed to start tournament", {
        description: error.reason || "An unexpected error occurred",
      });
    }
  };

  const handleReportMatch = (match) => {
    setSelectedMatch(match);
    setReportDialogOpen(true);
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

  const isParticipant = tournament.participantList.some(
    (p) => p.address.toLowerCase() === address?.toLowerCase()
  );
  
  const isFull = tournament.registeredParticipants >= tournament.maxParticipants;
  
  const isJoinDisabled =
    isJoining ||
    isFull ||
    isParticipant ||
    tournament.status !== "open";  

  const canStartTournament =
    isParticipant &&
    isFull &&
    tournament.status === "open";


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold">{tournament.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="default">
              {tournament.status === "open" && tournament.registeredParticipants < tournament.maxParticipants
                ? "Open for Entry"
                : "Active"}
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
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            onClick={handleStartTournament}
            disabled={!canStartTournament}
          >
            Start Tournament
          </Button>

          <Button
            onClick={handleJoinTournament}
            disabled={isJoinDisabled}
          >
            {isJoining
              ? "Joining..."
              : `Join Tournament (${tournament.entryFee})`}
          </Button>

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
                <Badge variant="default">
                  {tournament.status === "open" && tournament.registeredParticipants < tournament.maxParticipants
                    ? "Open"
                    : "Closed"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Entry Fee</span>
                <span className="font-medium">{tournament.entryFee}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Organizer</span>
                <span className="font-medium text-xs truncate max-w-[150px]">
                  CONFIDENTIAL {/* {tournament.organizer} */}
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
                  matches: tournamentMatches, // ✅ grouped by round
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
            <CardContent>
            {tournamentMatches.flat().length > 0 ? (
              <div className="space-y-4">
                {tournamentMatches.flat().map((match, index) => {
                  const isUserParticipant =
                    address?.toLowerCase() === match.player1.toLowerCase() ||
                    address?.toLowerCase() === match.player2.toLowerCase();

                  return (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Round {match.roundNumber}</span>
                        <Badge variant="outline">{match.status}</Badge>
                      </div>

                      <div className="flex justify-between items-center py-2">
                        <div className="text-sm truncate max-w-[40%] font-mono">{match.player1}</div>
                        <div className="text-xs text-muted-foreground">vs</div>
                        <div className="text-sm truncate max-w-[40%] text-right font-mono">{match.player2}</div>
                      </div>

                      {match.winner !== "0x0000000000000000000000000000000000000000" && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Winner: <span className="font-medium">{match.winner}</span>
                        </div>
                      )}

                      <div className="mt-3 flex justify-between items-center">
                        {isUserParticipant && match.status === MATCH_STATUS.SCHEDULED && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReportMatch(match)}
                          >
                            Report Result
                          </Button>
                        )}

                        {isUserParticipant && match.status === MATCH_STATUS.PENDING && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReportMatch(match)}
                          >
                            Confirm Result
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No matches scheduled yet</p>
              </div>
            )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <MatchReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        match={selectedMatch}
        onSubmit={({ winner }) => {
          toast.success("Match result submitted", {
            description: `You selected winner: ${winner}`,
          });
          setReportDialogOpen(false);
        }}
      />
    </div>
  );
}
