import { ethers } from "ethers";

import { uniswapPools, pancakePools } from "../pools/index.js";
import { swapService } from "./index.js";
import { config } from "../config.js";
import { decoderUtils, feesUtils, providerUtils } from "../utils/index.js";

export const monitorPrices = async ({ network, tokenIn, tokenOut, amountIn }) => {
    try {
        const [uniswapPool, pancakePool] = await Promise.all([
            uniswapPools.getPool({ network, dex: "uniswap", tokenIn, tokenOut, fee: 100 }),
            uniswapPools.getPool({ network, dex: "pancake", tokenIn, tokenOut, fee: 100 }),
        ]);

        const MIN_PROFIT_THRESHOLD = 0.05;

        // Determine which DEX to buy from and sell to
        let buyDex = "uniswap";
        let sellDex = "pancake";
        let buyPrice = uniswapPool.price * (1 + 0.0001);
        let sellPrice = pancakePool.price * (1 - 0.0001);

        if (pancakePool.price < uniswapPool.price) {
            buyDex = "pancake";
            sellDex = "uniswap";
            buyPrice = pancakePool.price * (1 + 0.0001);
            sellPrice = uniswapPool.price * (1 - 0.0001);
        }

        const grossProfit = (sellPrice - buyPrice) * amountIn;
        // Execute trades if profitable
        if (grossProfit > MIN_PROFIT_THRESHOLD) {
            console.time("execution time");
            console.log(`🚨 Arbitrage opportunity found! Executing trades... ${grossProfit}`);

            const provider = providerUtils.getProvider(network);

            const wallet = new ethers.Wallet(config.MAIN_ADDRESS_PRIVATE_KEY, provider);

            const tokenInContract = new ethers.Contract(tokenIn, config.ERC20_ABI, wallet);
            const tokenOutContract = new ethers.Contract(tokenOut, config.ERC20_ABI, wallet);

            // Execute buy trade
            const buyTrade = await swapTokens({
                network,
                tokenInContract,
                tokenOutContract,
                amountIn,
                dex: buyDex,
                provider,
                wallet,
            });

            if (!buyTrade?.receipt) {
                throw new Error("Buy trade failed");
            }

            // Execute sell trade
            const sellTrade = await swapTokens({
                network,
                tokenInContract: tokenOutContract,
                tokenOutContract: tokenInContract,
                amountIn: buyTrade.amountOut, // Use actual received amount
                dex: sellDex,
                provider,
                wallet,
            });

            const totalGasSpent = parseFloat(buyTrade.totalGasSpentEth) + parseFloat(sellTrade.totalGasSpentEth);
            const netProfit = grossProfit - totalGasSpent * sellPrice; // Convert gas cost to token terms

            const decodedBuy = decoderUtils.parseERC20Logs(buyTrade.receipt);
            const decodedSell = decoderUtils.parseERC20Logs(sellTrade.receipt);

            // buyTrade.decodedLogs = decodedBuy;
            // sellTrade.decodedLogs = decodedSell;

            console.timeEnd("execution time");
            console.log({ decodedBuy, decodedSell });

            return {
                timestamp: new Date().toISOString(),
                buyDex,
                sellDex,
                buyPrice,
                sellPrice,
                amountIn,
                grossProfit,
                totalGasSpent,
                netProfit,
                trades: {
                    buy: buyTrade,
                    sell: sellTrade,
                },
            };
        }

        return null; // No profitable opportunity found;
    } catch (err) {
        console.error(err);
    }
};
// monitorPrices({ network: "base" }).then((res) => console.log(res));

export const swapTokens = async ({ network, tokenInContract, tokenOutContract, amountIn, dex, provider, wallet }) => {
    try {
        if (!provider) provider = providerUtils.getProvider(network);
        if (!wallet) wallet = new ethers.Wallet(config.MAIN_ADDRESS_PRIVATE_KEY, provider);

        if (!tokenInContract) throw new Error("TokenIn address is required");
        if (!tokenOutContract) throw new Error("TokenOut address is required");
        if (!amountIn) throw new Error("AmountIn is required");
        if (!network) throw new Error("Network is required");
        if (!dex) throw new Error("Dex is required");

        const routerAddress = config.dexRouters[dex];

        if (!routerAddress) throw new Error("Router address not found for the specified dex.");

        const tokenIn = tokenInContract.target;
        const tokenOut = tokenOutContract.target;

        const [
            tokenInDecimals,
            tokenOutDecimals,
            tokenInSymbol,
            tokenOutSymbol,
            tokenInBalance,
            tokenOutBalance,
            tokenInAllowance,
        ] = await Promise.all([
            tokenInContract.decimals(),
            tokenOutContract.decimals(),
            tokenInContract.symbol(),
            tokenOutContract.symbol(),
            tokenInContract.balanceOf(wallet.address),
            tokenOutContract.balanceOf(wallet.address),
            tokenInContract.allowance(wallet.address, routerAddress),
        ]);

        const amountInWei = ethers.parseUnits(amountIn.toString(), tokenInDecimals);
        console.log(`${tokenInSymbol} balance: ${ethers.formatUnits(tokenInBalance, tokenInDecimals)}`);
        console.log(`${tokenOutSymbol} balance: ${ethers.formatUnits(tokenOutBalance, tokenOutDecimals)}`);
        console.log(`${tokenInSymbol} allowance: ${ethers.formatUnits(tokenInAllowance, tokenInDecimals)}`);

        if (tokenInAllowance < amountInWei) {
            let approvalAmount = parseFloat(tokenInDecimals.toString()) === 18 ? 0.1 : 20;
            const approvalMax = ethers.parseUnits(approvalAmount.toString(), tokenInDecimals);
            const approveTx = await tokenInContract.approve(routerAddress, approvalMax);
            await approveTx.wait();
            console.log("Approval transaction hash:", approveTx.hash);
        }
        console.log("Token allowance: ", ethers.formatUnits(tokenInAllowance, tokenInDecimals));

        let poolFeeBasis = 500;
        if (dex === "pancake") poolFeeBasis = 100;

        const poolData = await uniswapPools.getPool({ network, dex, tokenIn, tokenOut, fee: poolFeeBasis });

        const amountOut = await uniswapPools.quoteSwap({
            network,
            tokenIn: { address: tokenIn, decimals: tokenInDecimals },
            tokenOut: { address: tokenOut, decimals: tokenOutDecimals },
            amountIn: amountInWei,
            dex,
            wallet,
            fee: poolData.fee,
        });

        console.log(`Swapping ${amountIn} ${tokenInSymbol} for ${amountOut} ${tokenOutSymbol}`);

        const slippageTolerance = 0.005; // 0.5% slippage

        const amountOutFormatted = Number(amountOut).toFixed(tokenOutDecimals.toString());
        const amountOutWithSlippage = (Number(amountOutFormatted) * (1 - slippageTolerance)).toFixed(
            tokenOutDecimals.toString()
        );
        const amountOutMinWei = ethers.parseUnits(amountOutWithSlippage.toString(), tokenOutDecimals);

        const swapRouterAbi = dex === "uniswap" ? config.UNISWAP_ROUTER_ABI : config.PANCAKE_ROUTER_ABI;
        const routerContract = new ethers.Contract(routerAddress, swapRouterAbi, wallet);

        const transactionParams = {
            tokenIn,
            tokenOut,
            fee: poolData.fee,
            recipient: wallet.address,
            amountIn: amountInWei,
            amountOutMinimum: amountOutMinWei,
            sqrtPriceLimitX96: 0,
        };

        if (dex === "pancake") transactionParams.deadline = Math.floor(Date.now() / 1000) + 60 * 10;

        const swapTx = await routerContract.exactInputSingle.populateTransaction(transactionParams);
        const estimatedGas = await routerContract.exactInputSingle.estimateGas(transactionParams);

        const feeData = await provider.getFeeData();
        swapTx.gasPrice = (feeData.gasPrice * BigInt(1000)) / BigInt(100);
        swapTx.gasLimit = (estimatedGas * BigInt(1000)) / BigInt(100);

        const latestNonce = await provider.getTransactionCount(wallet.address, "latest");
        const pendingNonce = await provider.getTransactionCount(wallet.address, "pending");
        swapTx.nonce = latestNonce;
        console.log(`Latest: ${latestNonce}, Pending: ${pendingNonce}`);
        console.log("Gas params:", {
            // maxFeePerGas: swapTx.maxFeePerGas.toString(),
            // maxPriorityFeePerGas: swapTx.maxPriorityFeePerGas.toString(),
            gasLimit: swapTx.gasLimit.toString(),
            gasPrice: swapTx.gasPrice.toString(),
        });

        const tx = await wallet.sendTransaction(swapTx);

        console.log("Swap transaction hash:", tx.hash);

        await provider.ready;

        const receipt = await provider.waitForTransaction(tx.hash);

        let totalGasSpentWei = receipt.gasUsed * receipt.gasPrice;
        let totalGasSpentEth = ethers.formatUnits(totalGasSpentWei, "ether");

        console.log(`Total gas spent: ${totalGasSpentEth} ETH`);

        if (!receipt) throw new Error("Failed to broadcast transaction.");

        return { receipt, totalGasSpentEth, amountOut };
    } catch (err) {
        // console.error(err.message, err.code, err?.payload?.method);
        console.error(err.message, err.code, err);
    }
};
// swapTokens({
//     network: "base",
// tokenIn: "0x4200000000000000000000000000000000000006",
//     tokenOut: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
//     amountIn: "0.0002",
//     dex: "uniswap",
// }).then((res) => console.log(res));

// swapTokens({
//     network: "base",
//     tokenIn: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
//     tokenOut: "0x4200000000000000000000000000000000000006",
//     amountIn: "0.01",
//     dex: "pancake", // uniswap, pancake
// }).then((res) => console.log(res));
