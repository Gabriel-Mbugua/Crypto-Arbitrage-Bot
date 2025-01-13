import { ethers } from "ethers";

import { config } from "../config.js";

const { ROUTER_ABI } = config;

export const createSwapData = async ({
    tokenIn,
    tokenOut,
    amountIn,
    slippageTolerance = 0.005, // 0.5% slippage
    poolFee = 500, // 0.05% fee tier
    recipient,
    deadline = Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
    decimalsIn = 18,
}) => {
    const parsedAmountIn = ethers.parseUnits(amountIn.toString(), decimalsIn);

    const slippageMultiplier = BigInt(Math.floor((1 - slippageTolerance) * 1000));
    const amountOutMin = (parsedAmountIn * slippageMultiplier) / BigInt(1000);

    // Create swap parameters
    const params = {
        tokenIn,
        tokenOut,
        fee: poolFee,
        recipient,
        deadline,
        amountIn: parsedAmountIn.toString(),
        amountOutMinimum: amountOutMin.toString(),
        sqrtPriceLimitX96: 0, // No price limit
    };

    // Create contract interface
    const routerInterface = new ethers.Interface(ROUTER_ABI);

    // Encode function data
    const swapData = routerInterface.encodeFunctionData("exactInputSingle", [params]);

    return swapData;
};

const calculateMinimumAmountOut = (amountIn, slippage) => {
    return ethers.parseUnits((amountIn * (1 - slippage)).toString(), 18);
};

const calculateProfitability = (buyPrice, sellPrice, amount, gasEstimate) => {
    const grossProfit = (sellPrice - buyPrice) * amount;
    const netProfit = grossProfit - gasEstimate.totalGasCost;

    return {
        isProfitable: netProfit > 0,
        netProfit,
    };
};
