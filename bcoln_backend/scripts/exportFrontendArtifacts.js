const fs = require("fs");
const path = require("path");

const FRONTEND_CONTRACTS_DIR = path.join(__dirname, "../../bcoln_frontend/lib/contracts");

function exportArtifact(contractName, contractInstance) {
  const artifactPath = path.join(__dirname, `../artifacts/contracts/${contractName}.sol/${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  if (!fs.existsSync(FRONTEND_CONTRACTS_DIR)) {
    fs.mkdirSync(FRONTEND_CONTRACTS_DIR, { recursive: true });
  }

  fs.writeFileSync(
    path.join(FRONTEND_CONTRACTS_DIR, `${contractName}.json`),
    JSON.stringify({
      address: contractInstance.target,
      abi: artifact.abi,
    }, null, 2)
  );

  console.log(`Exported ${contractName} to frontend.`);
}

module.exports = async function exportFrontendArtifacts(tournament, factory) {
  exportArtifact("TournamentContract", tournament);
  exportArtifact("MatchContractFactory", factory);
};
