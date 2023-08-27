"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts_1 = require("../artifacts/ts");
const web3_1 = require("@alephium/web3");
// This deploy function will be called by cli deployment tool automatically
// Note that deployment scripts should prefixed with numbers (starting from 0)
const deployWalphe = async (deployer) => {
    const result = await deployer.deployContract(ts_1.Walphle, {
        // The initial states of the faucet contract
        initialFields: {
            poolSize: 2n * 10n ** 18n,
            poolOwner: "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y",
            poolFees: 10n,
            ratioAlphAlf: 0n,
            open: true,
            balance: 0n,
            numAttendees: 0n,
            attendees: Array(2).fill(web3_1.ZERO_ADDRESS),
            lastWinner: web3_1.ZERO_ADDRESS
        },
    });
    console.log('Walphle contract id: ' + result.contractInstance.contractId);
    console.log('Walphle contract address: ' + result.contractInstance.address);
};
exports.default = deployWalphe;
