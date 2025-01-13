export const getNetworkDetails = (network) => {
    switch (network.toLowerCase()) {
        case "eth":
        case "ethereum":
        case "ethereum-mainnet":
            return {
                chainId: 1,
                name: "homestead",
            };
        case "polygon":
        case "polygon-mainnet":
        case "matic":
            return {
                chainId: 137,
                name: "matic",
            };
        case "bsc":
        case "bsc-mainnet":
            return {
                chainId: 56,
                name: "bsc",
            };
        case "optimism":
            return {
                chainId: 10,
                name: "optimism",
            };
        case "base":
            // return `https://base.llamarpc.com`;
            return {
                chainId: 8453,
                name: "base",
            };
        case "celo":
            return {
                chainId: 42220,
                name: "celo",
            };
        case "arbitrum":
            return {
                chainId: 42161,
                name: "arbitrum",
            };
        default:
            console.log(`Unsupported network: ${network}`);
            return null;
    }
};
