import { useEffect } from "react";
import { getReadOnlyContract } from "@/lib/contracts";
import TournamentContractData from "@/../lib/contracts/TournamentContract.json";

export function useTournamentPolling(tournamentId, fetchTournament, lastKnownRoundRef) {
  useEffect(() => {
    if (!tournamentId) return;

    const interval = setInterval(async () => {
      try {
        const contract = await getReadOnlyContract(
          TournamentContractData.abi,
          TournamentContractData.address
        );

        const [, , , , , , , currentRound] = await contract.getTournamentDetails(tournamentId);

        if (
          lastKnownRoundRef.current !== null &&
          Number(currentRound) > lastKnownRoundRef.current
        ) {
          console.log("New round detected — refreshing UI");
          await fetchTournament();
        }
      } catch (error) {
        console.error("Error polling tournament round:", error);
      }
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [tournamentId, fetchTournament, lastKnownRoundRef]);
}
