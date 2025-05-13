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
import { MatchCard } from "@/components/match-card";
import { toast } from "sonner";
import { useWeb3 } from "@/hooks/use-web3";
import {
  Calendar,
  Trophy,
  Users,
  AlertCircle,
  CheckCircle2,
  CodeSquare,
} from "lucide-react";
import { ethers } from "ethers";
import { useRef } from "react";
import { mapStatus, getMatchDisplayStatus, getStatusString } from "@/lib/status";
import { getContract, getReadOnlyContract } from "@/lib/contracts";
import { groupMatchesByRound } from "@/lib/match";
import { useTournamentPolling } from "@/hooks/use-tournament-polling";
import { markResultSubmitted } from "@/lib/submissions";
import { TournamentUserStatus } from "@/components/tournament-user-status";

import TournamentContractData from "@/../lib/contracts/TournamentContract.json";
import MatchContractData from "../../../../lib/contracts/MatchContract.json";
import ReputationRegistryData from "../../../../lib/contracts/ReputationRegistry.json";

import { putJSONToIPFS, getJSONFromIPFS } from "@/lib/ipfs"


export default function TournamentDetailsPage() {
  const { id } = useParams();
  const { connected, address } = useWeb3();
  const [isJoining, setIsJoining] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [tournamentMatches, setTournamentMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [joiningMatchAddress, setJoiningMatchAddress] = useState(null);
  const lastKnownRound = useRef(null);

  const fetchTournament = async () => {
    setIsLoading(true);
    try {
      const contract = await getContract(
        TournamentContractData.abi,
        TournamentContractData.address
      );

      console.log(contract);
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
        totalPrize,
        participants,
      ] = await contract.getTournamentDetails(id);

      const _matches = await contract.getAllTournamentMatches(id);

      console.log(_matches);

      const groupedMatches = groupMatchesByRound(_matches, totalRounds);

      setTournamentMatches(groupedMatches);

      const parsedTournament = {
        title: name,
        description,
        entryFee: ethers.formatEther(entryFee),
        prize: ethers.formatEther(totalPrize),
        maxParticipants: Number(maxParticipants),
        registeredParticipants: Number(registeredParticipants),
        participantList: Array.from(participants).map((address) => ({
          address,
        })),
        startDate: new Date(Number(startTime) * 1000).toLocaleDateString(),
        status: mapStatus(status),
        currentRound,
        totalRounds,
        totalPrize: ethers.formatEther(totalPrize),
        _matches,
      };

      setTournament(parsedTournament);
      lastKnownRound.current = Number(parsedTournament.currentRound);
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

  useTournamentPolling(id, fetchTournament, lastKnownRound);

  const handleJoinTournament = async () => {
    if (!connected) {
      toast.info("Wallet not connected", {
        description: "Please connect your wallet to join this tournament",
      });
      return;
    }

    setIsJoining(true);
    try {
      const contract = await getContract(
        TournamentContractData.abi,
        TournamentContractData.address
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
      const contract = await getContract(
        TournamentContractData.abi,
        TournamentContractData.address
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

  const joinMatchForUser = async (match) => {
    try {
      setJoiningMatchAddress(match.matchAddress);

      console.log(match.matchAddress);

      const matchContract = await getContract(
        MatchContractData.abi,
        match.matchAddress
      );

      const entryFee = await matchContract.getEntryFee();

      const tx = await matchContract.joinMatch({ value: entryFee });

      toast.success("Joining match...");

      await tx.wait();

      toast.success("You joined the match!");
      await fetchTournament();
    } catch (error) {
      console.error("Join match error:", error);
      toast.error("Could not join match", {
        description: error.reason || "Check your wallet and try again.",
      });
    } finally {
      setJoiningMatchAddress(null);
    }
  };

  const handleMatchResultSubmit = async ({ match, winner }) => {
    try {
      const matchContract = await getContract(
        MatchContractData.abi,
        match.matchAddress
      );

      const matchLogTemplate = {
        date: new Date().toISOString(),
        address: match.matchAddress,
        participants: [match.player1, match.player2],
        winner: winner
      }

      try {
        console.log("Uploading Matchlog to IPFS: ", matchLogTemplate);
        const CID = await putJSONToIPFS(matchLogTemplate);
        console.log("CID: ", CID);

        // Also upload to matchcontract
        const uploadMatchLogTx = await matchContract.storeMatchLog(CID);
      } catch (error) {
        console.warn("Unable to post to ipfs: ", error);
      }

      const repRegistryAddress = await matchContract.reputationRegistry();

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const repContract = new ethers.Contract(
        repRegistryAddress,
        ReputationRegistryData.abi,
        signer
      );

      // Get required stake amount based on player's reputation
      const stakeAmount = await repContract.getStakeAmount(address);

      // Generate a random salt
      const saltBytes = ethers.randomBytes(32);
      const salt = ethers.hexlify(saltBytes);

      // Determine if current user is the winner
      const didIWin = address.toLowerCase() === winner.toLowerCase();

      const commitment = ethers.solidityPackedKeccak256(
        ["string", "bytes32"],
        ["I_report_truth", salt]
      );
      // Submit result with stake
      const tx = await matchContract.commitAndRevealResult(commitment, didIWin, {
        value: stakeAmount,
      });

      toast.success("Submitting result...", {
        description: "Waiting for confirmation...",
      });

      await tx.wait();

      toast.success("Match result submitted successfully!");
      markResultSubmitted(match.matchAddress, address);


      await fetchTournament(); // refresh UI
    } catch (error) {
      console.error("Match submission error:", error);
      toast.error("Error submitting result", {
        description: error.reason || "Check your wallet and try again.",
      });
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

  const isParticipant = tournament.participantList.some(
    (p) => p.address.toLowerCase() === address?.toLowerCase()
  );

  const isFull =
    tournament.registeredParticipants >= tournament.maxParticipants;

  const isJoinDisabled =
    isJoining || isFull || isParticipant || tournament.status !== "open";

  const canStartTournament =
    isParticipant && isFull && tournament.status === "open";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold">{tournament.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="default">
              {tournament.status === "open"
                ? "Open"
                : tournament.status === "upcoming"
                  ? "Upcoming"
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
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            onClick={handleStartTournament}
            disabled={!canStartTournament}
          >
            Start Tournament
          </Button>

          <Button onClick={handleJoinTournament} disabled={isJoinDisabled}>
            {isJoining
              ? "Joining..."
              : "Join Tournament"}
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
                  {tournament.status === "open" &&
                    tournament.registeredParticipants < tournament.maxParticipants
                    ? "Open"
                    : "Closed"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Entry Fee</span>
                <Badge variant="default">
                  {tournament.entryFee}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Organizer</span>
                <span className="font-medium text-xs truncate max-w-[150px]">
                  CONFIDENTIAL {/* {tournament.organizer} */}
                </span>
              </div>
              {isParticipant && <TournamentUserStatus tournament={tournament} address={address} />}
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
                  matches: tournamentMatches, // grouped by round
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
                  {tournamentMatches
                    .flat()
                    .sort((a, b) => {
                      const order = ["pending", "commit", "reveal", "completed", "dispute"];
                      return order.indexOf(a.status) - order.indexOf(b.status);
                    })
                    .map((match, index) => (
                      <MatchCard
                        key={index}
                        match={match}
                        address={address}
                        joiningMatchAddress={joiningMatchAddress}
                        onJoinMatch={joinMatchForUser}
                        onReportMatch={handleReportMatch}
                      />
                    ))}
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
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        match={selectedMatch}
        onSubmit={async ({ winner, match }) => {
          await handleMatchResultSubmit({ match, winner });
          setReportDialogOpen(false);
        }}
      />
    </div>
  );
}
