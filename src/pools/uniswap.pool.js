import { ethers } from "ethers";

import { config } from "../config.js";
import { providerUtils } from "../utils/index.js";

const abi = [
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function liquidity() external view returns (uint128)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
];

const uniswapFactoryAbi = [
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
];

const poolAbi = [
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function liquidity() external view returns (uint128)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
    "function fee() external view returns (uint24)",
];

const QuoterAbi = [
    "function WETH9() external view returns (address)",
    "function factory() external view returns (address)",
    "function quoteExactInput(bytes calldata path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
    "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
    "function quoteExactOutput(bytes calldata path, uint256 amountOut) external returns (uint256 amountIn, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
    "function quoteExactOutputSingle((address tokenIn, address tokenOut, uint256 amount, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountIn, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
    "function uniswapV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes calldata path) external view",
];

export const getPoolPrices = async ({ network, pair, dex }) => {
    const provider = providerUtils.getProvider(network);

    const poolAddress = config.dexPools?.[dex]?.[network]?.[pair.toLowerCase()].toLowerCase();

    if (!poolAddress) throw new Error("Pool address not found");

    const pool = new ethers.Contract(poolAddress, abi, provider);

    // Get current price from slot0
    const { sqrtPriceX96 } = await pool.slot0();
    const [token0, token1, liquidity] = await Promise.all([pool.token0(), pool.token1(), pool.liquidity()]);
    // Convert sqrtPriceX96 to actual price

    const baseAmount = 1n << 192n;
    const priceX96Squared = BigInt(sqrtPriceX96) * BigInt(sqrtPriceX96);
    const price = Number((priceX96Squared * 10n ** 18n) / baseAmount) / 10 ** 6;

    return {
        sqrtPriceX96,
        price,
        token0,
        token1,
        liquidity,
    };
};

// getPoolPrices({ network: "base", pair: "eth_usdc" }).then((res) => console.log(res));

export const getPool = async ({ provider, network, dex, tokenIn, tokenOut, fee }) => {
    if (!provider) provider = providerUtils.getProvider(network);

    const factoryAddress = config.dexFactories?.[dex]?.[network];
    if (!factoryAddress) throw new Error("Factory address not found");
    const factory = new ethers.Contract(factoryAddress, uniswapFactoryAbi, provider);

    const poolAddress = await factory.getPool(tokenIn, tokenOut, fee);

    if (poolAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("Pool does not exist for these parameters");
    }

    const poolContract = new ethers.Contract(poolAddress, poolAbi, provider);

    const [token0, token1, poolFee, slot0] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.slot0(),
    ]);

    const sqrtPriceX96 = slot0[0];

    const baseAmount = 1n << 192n;
    const priceX96Squared = BigInt(sqrtPriceX96) * BigInt(sqrtPriceX96);
    const price = Number((priceX96Squared * 10n ** 18n) / baseAmount) / 10 ** 6;

    return {
        token0,
        token1,
        fee: poolFee,
        poolAddress,
        poolContract,
        price,
    };
};

// getPool({
//     network: "base",
//     tokenIn: "0x4200000000000000000000000000000000000006",
//     tokenOut: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
//     fee: 500,
// }).then((res) => console.log(res));

export const quoteSwap = async ({ network, dex, tokenIn, tokenOut, amountIn, wallet, fee = 3000 }) => {
    if (!config.dexQuoters?.[dex]?.[network]) throw new Error("Quoter not found");

    const quoterContract = new ethers.Contract(
        config.dexQuoters[dex][network],
        QuoterAbi,
        providerUtils.getProvider(network)
    );

    const quotedAmountOut = await quoterContract.quoteExactInputSingle.staticCall({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        fee,
        recipient: wallet.address,
        deadline: Math.floor(new Date().getTime() / 1000 + 60 * 10),
        amountIn: amountIn,
        sqrtPriceLimitX96: 0,
    });

    const amountOut = ethers.formatUnits(quotedAmountOut[0], tokenOut.decimals);
    return amountOut;
};
