# BCOLN_dApp

**SETUP**

Initially, install the requirements and run the hardhat network.
```shell
npm install && npx hardhat node
```

To clean previous compilations and (re-)compile the contracts:

```shell
npx hardhat clean
npx hardhat compile
```

To deploy and run a hardhat script on the local network, use the following command.

```shell
npx hardhat run .\scripts\deployMatchSystem.js --network localhost
```

To be able to run a local ipfs node:
- Download [Kubo](https://docs.ipfs.tech/install/command-line/#install-official-binary-distributions)
- Update the config file to allow CORS by updating the config with the following HTTP-Headers (just at the top):
```json
"HTTPHeaders": { "Access-Control-Allow-Credentials": [ "true" ], "Access-Control-Allow-Headers": [ "Authorization" ], "Access-Control-Allow-Methods": [ "GET", "POST", "PUT", "DELETE", "OPTIONS" ], "Access-Control-Allow-Origin": [ "http://localhost:3000", "http://127.0.0.1:3000" ], "Access-Control-Expose-Headers": [ "Location", "Content-Type" ] }
```
- Run the ipfs daemon with the updated config



**Architecture**

- MatchContractFactory ---Creates/Clones---> MatchContracts

- MatchContractFactory ---Maintains---> ReputationRegistry

MatchContracts are created by the MatchContractFactory. Each MatchContractFactory maintains a ReputationRegistry. *Perhabs having a single, globally unique ReputationRegistry would be an option to consider, currently every MatchContractFactory creates and maintains it's own ReputationRegistry.*

We use the EIP-1167 to save on Gas Costs when creating new MatchContracts, as only the first MatchContract in a MatchContractFactory (the automatically deployed MatchContractTemplate) is an actual deployed contract, whereas every other MatchContract created after is simply a clone, which is essentially only delegating function calls to the initial MatchContractTemplate. Therefore stored bytecode is reduced noticeably, only stored data is considered.
*The proxy forwards all calls to a fixed implementation contract while using minimal bytecode to reduce deployment costs.*

For more, see: https://eips.ethereum.org/EIPS/eip-1167