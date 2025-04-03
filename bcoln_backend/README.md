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



**Architecture**

- MatchContractFactory ---Creates/Clones---> MatchContracts

- MatchContractFactory ---Maintains---> ReputationRegistry

MatchContracts are created by the MatchContractFactory. Each MatchContractFactory maintains a ReputationRegistry. *Perhabs having a single, globally unique ReputationRegistry would be an option to consider, currently every MatchContractFactory creates and maintains it's own ReputationRegistry.*

We use the EIP-1167 to save on Gas Costs when creating new MatchContracts, as only the first MatchContract in a MatchContractFactory (the automatically deployed MatchContractTemplate) is an actual deployed contract, whereas every other MatchContract created after is simply a clone, which is essentially only delegating function calls to the initial MatchContractTemplate. Therefore stored bytecode is reduced noticeably, only stored data is considered.
*The proxy forwards all calls to a fixed implementation contract while using minimal bytecode to reduce deployment costs.*

For more, see: https://eips.ethereum.org/EIPS/eip-1167