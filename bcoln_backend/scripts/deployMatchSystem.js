// scripts/deployMatchSystem.js
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const hre = require("hardhat");

async function main() {
    const [dev, player1, player2, host] = await hre.ethers.getSigners();

    // 1. Deploy Factory
    const Factory = await hre.ethers.getContractFactory("MatchContractFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    console.log("Factory deployed to:", await factory.getAddress());

    // 2. Create Match
    const tx = await factory.connect(host).createMatch(player1.address, player2.address, 16);
    const receipt = await tx.wait();

    // Extract MatchCreated event
    const matchCreatedEvent = receipt.logs.find(
        log => log.fragment?.name === "MatchCreated"
    );
    const matchAddress = matchCreatedEvent.args[0];
    console.log("Match deployed to:", matchAddress);

    // 3. Get Match Contract instance
    const Match = await hre.ethers.getContractFactory("MatchContract");
    const matchContract = Match.attach(matchAddress);

    // To listen to events
    matchContract.on("PlayerJoined", (player) => {
        console.log(`Player ${player} joined`);
    });


    const matchStatus = await matchContract.getMatchStatus()

    console.log(`match status: ${matchStatus == 0 ? "Pending" : "Commit"}`)

    try {
        const joinResult = await matchContract.connect(player1).joinMatch({
            value: hre.ethers.parseUnits("16.0", "wei")
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log("Join Player1 successful!");
    } catch (error) {
        console.log("Unexpected error:", error);
    }

    try {
        const joinResult = await matchContract.connect(player2).joinMatch({
            value: hre.ethers.parseUnits("16.0", "wei")
        });

        // Wait for event
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log("Join Player2 successful!");
    } catch (error) {
        console.log("Unexpected error:", error);
    }

    const afterJoinMatchStatus = await matchContract.getMatchStatus()

    console.log(`match status: ${afterJoinMatchStatus == 0 ? "Pending" : "Commit"}`)

}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });