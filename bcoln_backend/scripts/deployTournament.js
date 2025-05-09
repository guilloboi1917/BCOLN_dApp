// scripts/deploy.js
const { ethers } = require("hardhat");
const exportFrontendArtifacts = require("./exportFrontendArtifacts");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with ${deployer.address}`);

  // Deploy Factory
  const Factory = await ethers.getContractFactory("MatchContractFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`MatchContractFactory deployed to: ${factoryAddress}`);

  // Deploy TournamentContract
  const TournamentContract = await ethers.getContractFactory("TournamentContract");
  const tournament = await TournamentContract.deploy(factoryAddress);
  await tournament.waitForDeployment();
  const tournamentAddress = await tournament.getAddress();
  console.log(`TournamentContract deployed to: ${tournamentAddress}`);

  await exportFrontendArtifacts(tournament, factory);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
