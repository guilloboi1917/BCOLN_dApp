require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition-ethers");


// Custom task to reset the local Hardhat node
task("reset-node", "Resets the local Hardhat node", async () => {
  const { ethers } = require("hardhat");
  await ethers.provider.send("hardhat_reset", []);
  console.log("Local node reset.");
});

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20", // Use your solidity version
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // hardhat: {
    //   chainId: 31337,
    //   allowUnlimitedContractSize: true,
    //   blockGasLimit: 10000000
    // },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  },
  ignition: {
    strategyConfig: {
      create2: {
        salt: "esports-dapp-salt" // For deterministic deployment
      }
    }
  }
};
