import { ethers } from "ethers";

import { config } from "../config.js";
import { providerUtils } from "../utils/index.js";

const abi = [
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function liquidity() external view returns (uint128)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
];

const factoryAbi = [
    "function getPool(address token0, address token1, uint24 fee) external view returns (address pool)",
];

const poolAbi = [
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function liquidity() external view returns (uint128)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
    "function fee() external view returns (uint24)",
];

export const getPoolPrices = async ({ network, pair }) => {
    const provider = providerUtils.getProvider(network);

    const poolAddress = config.dexPools.pancake[pair.toLowerCase()].toLowerCase();

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

export const getPool = async ({ network, tokenIn, tokenOut, fee = 2500 }) => {
    const provider = providerUtils.getProvider(network);
    const factoryAddress = config.dexFactories.pancake[network];

    if (!factoryAddress) throw new Error("Factory address not found");

    const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);

    // PancakeSwap V3 pools use the same getPool interface
    const poolAddress = await factory.getPool(tokenIn, tokenOut, fee);

    if (poolAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("Pool does not exist for these parameters");
    }

    const poolContract = new ethers.Contract(poolAddress, poolAbi, provider);

    const [token0, token1, poolFee] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
    ]);

    return {
        token0,
        token1,
        fee: poolFee,
        poolAddress,
        poolContract,
    };
};
// getPool({
//     network: "base",
//     tokenIn: "0x4200000000000000000000000000000000000006",
//     tokenOut: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
//     fee: 2500,
// }).then((res) => console.log(res));
