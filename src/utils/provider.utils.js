import { ethers } from "ethers";
import { config } from "../config.js";
import { getNetworkDetails } from "./network.utils.js";

const { infuraApiKey } = config;

export const getProviderUrl = (network) => {
    switch (network.toLowerCase()) {
        case "eth":
        case "ethereum":
        case "ethereum-mainnet":
            return `https://mainnet.infura.io/v3/${infuraApiKey}`;
        case "polygon":
        case "polygon-mainnet":
        case "matic":
            return `https://polygon-mainnet.infura.io/v3/${infuraApiKey}`;
        case "bsc":
        case "bsc-mainnet":
            return `https://bsc-mainnet.infura.io/v3/${infuraApiKey}`;
        case "optimism":
            return `https://optimism-mainnet.infura.io/v3/${infuraApiKey}`;
        case "base":
            // return `https://base.llamarpc.com`;
            return `https://base-mainnet.infura.io/v3/${infuraApiKey}`;
        case "celo":
            return `https://celo-mainnet.infura.io/v3/${infuraApiKey}`;
        case "arbitrum":
            return `https://arbitrum-mainnet.infura.io/v3/${infuraApiKey}`;
        default:
            console.log(`Unsupported network: ${network}`);
            return null;
    }
};

export const getProvider = (network) => {
    const providerUrl = getProviderUrl(network);

    const provider = new ethers.JsonRpcProvider(providerUrl);

    return provider;
};

export const getDefaultProvider = async (network) => {
    const networkDetails = getNetworkDetails(network);

    // handle unsupported networks
    if (["base", "celo"].includes(networkDetails.name)) return getProvider(network);

    const provider = new ethers.getDefaultProvider(networkDetails.chainId, {
        infura: infuraApiKey,
    });

    const networkInfo = await provider.getNetwork();

    console.log(networkInfo.name);

    return provider;
};
// getDefaultProvider("base");
