"use strict";
/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDeployments = void 0;
const _1 = require(".");
const _deployments_devnet_json_1 = __importDefault(require("../.deployments.devnet.json"));
function toDeployments(json) {
    const contracts = {
        Walphle: {
            ...json.contracts["Walphle"],
            contractInstance: _1.Walphle.at(json.contracts["Walphle"].contractInstance.address),
        },
    };
    return {
        ...json,
        contracts: contracts,
    };
}
function loadDeployments(networkId, deployerAddress) {
    const deployments = networkId === "devnet" ? _deployments_devnet_json_1.default : undefined;
    if (deployments === undefined) {
        throw Error("The contract has not been deployed to the " + networkId);
    }
    const allDeployments = Array.isArray(deployments)
        ? deployments
        : [deployments];
    if (deployerAddress === undefined) {
        if (allDeployments.length > 1) {
            throw Error("The contract has been deployed multiple times on " +
                networkId +
                ", please specify the deployer address");
        }
        else {
            return toDeployments(allDeployments[0]);
        }
    }
    const result = allDeployments.find((d) => d.deployerAddress === deployerAddress);
    if (result === undefined) {
        throw Error("The contract deployment result does not exist");
    }
    return toDeployments(result);
}
exports.loadDeployments = loadDeployments;
