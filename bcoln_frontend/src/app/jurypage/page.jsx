"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, SearchCheck, Download } from "lucide-react";
import { ethers, Contract, BrowserProvider } from "ethers";
import { Card } from "@/components/ui/card"; // Make sure to import Card
import { useWeb3 } from "@/hooks/use-web3";
import { Button } from "@/components/ui/button";
import { JuryVoteDialog } from "@/components/jury-vote-dialog";

import TournamentContractData from "../../../lib/contracts/TournamentContract.json";
import MatchContractData from "../../../lib/contracts/MatchContract.json";
import MatchContractFactoryData from "../../../lib/contracts/MatchContractFactory.json";
import { getJSONFromIPFS } from "@/lib/ipfs";

export default function JuryPage() {
  const {
    connected,
    address,
    getMatchDetails,
    provider,
    network,
    joinJuryAndVote,
  } = useWeb3();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("dispute");
  const [contract, setContract] = useState(null);
  const [disputedMatches, setDisputedMatches] = useState([]);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!contract) return;

    console.log("Setting up event listeners for contract:", contract.address);

    const handleDisputeInitiated = (contractAddress, event) => {
      console.log("DisputeInitiated event received:", {
        contractAddress,
        event,
      });
      setDisputedMatches((prev) => [
        ...prev,
        {
          id: event.transactionHash,
          title: `Dispute ${event.transactionHash.slice(0, 8)}`,
          status: "disputed",
        },
      ]);
    };

    // Add listeners
    contract.on("DisputeInitiated", handleDisputeInitiated);

    // Debug: Query past events to verify they exist
    const getPastEvents = async () => {
      try {
        const disputeEvents = await contract.queryFilter("DisputeInitiated");
        console.log("Past DisputeInitiated events:", disputeEvents);

        const unresolvedDisputeEvents = await Promise.all(
          disputeEvents.map(async (event) => {
            try {
              const matchDetail = await getMatchDetails(event.args[0]);
              return {
                address: event.args[0],
                name: `DisputedMatch_${matchDetail[0].slice(0, 6)}_vs_${matchDetail[1].slice(0, 6)}`,
                status: matchDetail[3],
                player1: matchDetail[0],
                player2: matchDetail[1],
                player1IPFSCID: matchDetail.p1IPFSCID,
                player2IPFSCID: matchDetail.p2IPFSCID
              };
            } catch (error) {
              console.error(
                `Failed to fetch match details for event ${event.args[0]}:`,
                error
              );
              return null; // or a default object
            }
          })
        ).then((results) => results.filter(Boolean));

        setDisputedMatches(unresolvedDisputeEvents);
      } catch (error) {
        console.error("Error querying past events:", error);
      }
    };
    getPastEvents();

    return () => {
      contract.off("DisputeInitiated", handleDisputeInitiated);
    };
  }, [contract]);

  useEffect(() => {
    const initializeContract = async () => {
      if (!connected || !provider) {
        console.log("Wallet not connected yet. Skipping contract initialization.");
        return;
      }
  
      try {
        console.log("Initializing provider and contract...");
        console.log("Connected to network:", network);
  
        const signer = await provider.getSigner();
        console.log("Signer address:", await signer.getAddress());
  
        const matchFactoryContract = new Contract(
          "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          MatchContractFactoryData.abi,
          signer
        );
  
        console.log("Contract initialized:", matchFactoryContract);
        setContract(matchFactoryContract);
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };
  
    initializeContract();
  }, [connected, provider]);
  

  const mapStatus = (statusId) => {
    return (
      ["pending", "commit", "reveal", "dispute", "completed"][statusId] ||
      "unknown"
    );
  };

  const handleJoinJury = (match) => {
    setSelectedMatch(match); // Store the selected match
    setVoteDialogOpen(true);
  };

  const handleVoteSubmit = async (vote) => {
    if (!selectedMatch || !joinJuryAndVote) return;

    setIsSubmitting(true);
    try {
      // Call your smart contract function
      await joinJuryAndVote(selectedMatch.address, vote);

      console.log("Voted submitted successfully");

      setVoteDialogOpen(false);
      // Optionally refresh the matches list
    } catch (error) {
      console.warn("Error submitting vote:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadMatchLogs = async (match) => {
    try {
      console.log("Player1CID: ", match.player1IPFSCID);
      console.log("Player2CID: ", match.player2IPFSCID);

      // Fetch both logs in parallel
      const [matchLog1, matchLog2] = await Promise.all([
        getJSONFromIPFS(match.player1IPFSCID),
        getJSONFromIPFS(match.player2IPFSCID)
      ]);


      // Create download function
      const downloadJSON = (data, filename) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      // Download both files
      downloadJSON(matchLog1, `match-log-player1-${match.matchId}.json`);
      downloadJSON(matchLog2, `match-log-player2-${match.matchId}.json`);

    } catch (error) {
      console.error('Error downloading match logs:', error);
      // Handle error (e.g., show toast notification)
    }
  };
  // Memoized filtered matches
  const filteredMatches = useCallback(() => {
    return disputedMatches.filter((match) => {
      const matchesSearch = match.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus = mapStatus(match.status) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [disputedMatches, searchTerm, statusFilter]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dispute Resolution</h1>
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Disputed Matches..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="dispute">Disputed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {filteredMatches().length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches().map((match, index) => (
            <Card key={index} className="p-4 flex justify-between">
              <div className="space-y-1">
                <h3 className="font-medium">{match.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Status: {mapStatus(match.status)}
                </p>
              </div>
              <div>
                {/* Button with inline tooltip */}
                <div className="group ml-auto relative inline-block">
                  <Button
                    size="lg"
                    className="h-10 w-10 hover:bg-gray-400"
                    onClick={() => handleJoinJury(match)}
                    aria-label="Join Jury"
                  >
                    <SearchCheck className="h-5 w-5" />
                  </Button>
                  {/* Tooltip (appears on hover) */}
                  <span className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute top-full right-0 mt-1 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap">
                    Join Jury
                  </span>
                </div>

                {/* Button with inline tooltip */}
                <div className="group ml-5 relative inline-block">
                  <Button
                    size="lg"
                    className="h-10 w-10 hover:bg-gray-400"
                    onClick={() => handleDownloadMatchLogs(match)}
                    aria-label="Download Match Logs"
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                  {/* Tooltip (appears on hover) */}
                  <span className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute top-full right-0 mt-1 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap">
                    Download Match Logs
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium">No Disputed Matches found</h3>
          <p className="text-muted-foreground mt-2">
            Try adjusting your search or filters
          </p>
        </div>
      )}
      <JuryVoteDialog
        open={voteDialogOpen}
        onOpenChange={setVoteDialogOpen}
        match={selectedMatch}
        onSubmit={async (vote) => {
          // vote will be 1 or 2
          try {
            console.log(selectedMatch);
            await handleVoteSubmit(vote);
            console.log("Vote submitted successfully");
            setVoteDialogOpen(false);
          } catch (error) {
            console.error("Error submitting vote: ", error);
          }
        }}
      />
    </div>
  );
}
