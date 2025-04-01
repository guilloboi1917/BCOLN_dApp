const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MatchCollectionSystem", (m) => {
    const dev = m.getAccount(0);
    const player1 = m.getAccount(1);
    const player2 = m.getAccount(2);
    const host = m.getAccount(3);

    // 1. Deploy the factory
    const factory = m.contract("MatchContractFactory", [], {
        from: dev,
        id: "factory"
    });

    // 2. Create the match and get its address
    const matchCreation = m.call(factory, "createMatch", [player1, player2, 16], {
        from: host,
        id: "matchCreation"
    });

    const matchAddress = m.readEventArgument(matchCreation, "MatchCreated", "matchAddress");

    // 3. Create a contract instance from the returned address
    const matchContract = m.contractAt("MatchContract", matchAddress, {
        from: dev,
        id: "matchContract"
    });

    // 4. Now you can interact with the match contract
    const statusCall = m.call(matchContract, "getMatchStatus", [], {
        from: dev,
        id: "getStatus"
    });


    const numberCall = m.call(matchAddress, "getNumber", [], {
        from: dev,
        id: "numberCall"
    });


    return { factory };
});