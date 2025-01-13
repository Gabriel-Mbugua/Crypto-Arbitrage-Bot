import { ethers } from "ethers";
import { config } from "../config.js";
import { providerUtils } from "../utils/index.js";

export const executeTransaction = async ({ to, token, value, network }) => {
    try {
        const provider = providerUtils.getProvider(network);
        const wallet = new ethers.Wallet(config.MAIN_ADDRESS_PRIVATE_KEY, provider);

        if (!to) throw new Error("To address is required");
        if (!value) throw new Error("Value is required");
        if (!network) throw new Error("Network is required");

        const transaction = {
            to,
            value: ethers.parseUnits(value, 18),
            data: "0x",
        };

        if (token) {
            const tokenContract = new ethers.Contract(token, config.ERC20_ABI, provider);
            const decimals = await tokenContract.decimals();
            const amountIn = ethers.parseUnits(transaction.value, decimals);
            const data = tokenContract.interface.encodeFunctionData("transfer", [to, amountIn]);
            transaction.data = data;
            transaction.to = token;
            transaction.value = "0";
        }

        const populateTransaction = await wallet.populateTransaction(transaction);

        const signedTx = await wallet.signTransaction(populateTransaction);

        const tx = await provider.broadcastTransaction(signedTx);
        const receipt = await provider.waitForTransaction(tx.hash);

        if (!receipt) throw new Error("Failed to broadcast transaction.");

        return receipt;
    } catch (error) {
        console.error("Error executing transaction:", error);
    }
};
// executeTransaction({
//     to: "0x2D5Ac45268d48244631De3E73049FBc6aabE5De9",
//     value: "0.00001",
//     network: "base",
// }).then((res) => console.log(res));

// executeTransaction({
//     to: "0x2D5Ac45268d48244631De3E73049FBc6aabE5De9",
//     value: "0.00001",
//     token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
//     network: "base",
// }).then((res) => console.log(res));

export const checkTransaction = async ({ txHash, network }) => {
    try {
        const provider = providerUtils.getProvider(network);
        const tx = await provider.getTransaction(txHash);
        if (tx && tx.blockNumber) return await provider.getTransactionReceipt(txHash);
        console.log("Transaction pending...");
        return null;
    } catch (error) {
        console.error("Error checking transaction:", error);
        return null;
    }
};
// checkTransaction({
//     txHash: "0x8363a003b6b31d239b9e54fcca098906871e1be370b0987192a06533cd05081e",
//     network: "base",
// }).then((res) => console.log(res));
