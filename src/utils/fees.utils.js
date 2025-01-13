import { ethers } from "ethers";
import { providerUtils } from "./index.js";
import { config } from "../config.js";

const { ROUTER_ABI } = config;

export const getGasFees = async ({ network }) => {
    const provider = providerUtils.getProvider(network);

    const gasPrice = await provider.getFeeData();

    return gasPrice;
};
// getGasFees({ network: "base" }).then((res) => console.log(res));

export const estimateTransactionGas = async ({ network, toAddress, token, value }) => {
    const provider = providerUtils.getProvider(network);
    const wallet = new ethers.Wallet(config.MAIN_ADDRESS_PRIVATE_KEY, provider);
    // Decode the transaction data
    // const iface = new ethers.Interface(ROUTER_ABI);
    // console.log("Decoded data:", iface.parseTransaction({ data }));

    const transaction = {
        to: toAddress,
        value: ethers.parseUnits(value, 18),
        data: "0x",
    };

    if (token) {
        const tokenContract = new ethers.Contract(token, config.ERC20_ABI, provider);
        const decimals = await tokenContract.decimals();
        const amountIn = ethers.parseUnits(value, decimals);
        const data = tokenContract.interface.encodeFunctionData("transfer", [toAddress, amountIn]);
        transaction.data = data;
        transaction.to = token;
        transaction.value = "0";
    }
    const populateTransaction = await wallet.populateTransaction(transaction);

    const gasLimit = await provider.estimateGas(populateTransaction);

    // Get current gas prices
    const { gasPrice } = await getGasFees({ network });

    // Calculate total gas cost (L2 + L1)
    const gasCost = Number(gasLimit) * Number(gasPrice);

    const gasCostFormated = ethers.formatEther(gasCost);

    return {
        gasCost: gasCostFormated,
        gasLimit: Number(gasLimit),
        gasPrice: Number(gasPrice),
    };
};
// estimateTransactionGas({
//     network: "base",
//     token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
//     toAddress: "0xFE6508f0015C778Bdcc1fB5465bA5ebE224C9912",
//     value: "0.000030",
// }).then((res) => console.log(res));
