# BCOLN_dApp

```shell
npx install && npx hardhat node
```

To run the hardhat script and test some functionalities, first run the network with

```shell
npx hardhat node
```

Then:

```shell
npx hardhat run .\scripts\deployMatchSystem.js --network localhost
```

To clean previous compilations and recompile the contracts:

```shell
npx hardhat clean
npx hardhat compile
```