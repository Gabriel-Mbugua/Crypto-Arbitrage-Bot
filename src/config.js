import dotenv from "dotenv";

dotenv.config();

export const config = {
    infuraApiKey: process.env.INFURA_API_KEY,
    MAIN_ADDRESS: process.env.MAIN_ADDRESS,
    MAIN_ADDRESS_PRIVATE_KEY: process.env.MAIN_ADDRESS_PRIVATE_KEY,
    dexFactories: {
        pancake: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
        uniswap: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    },
    dexPools: {
        uniswap: {
            eth_usdc: "0xd0b53D9277642d899DF5C87A3966A349A798F224",
        },
        pancake: {
            eth_usdc: "0x72AB388E2E2F6FaceF59E3C3FA2C4E29011c2D38",
        },
    },
    dexRouters: {
        pancake: "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
        uniswap: "0x2626664c2603336E57B271c5C0b26F421741e481",
    },
    dexQuoters: {
        uniswap: {
            base: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
        },
        pancake: {
            base: "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
        },
    },
    dexFactories: {
        pancake: {
            base: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
        },
        uniswap: {
            base: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
        },
    },
    UNISWAP_ROUTER_ABI: [
        "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 sendNativeETH) external returns (uint256[] memory amounts)",
        "function swapTokensForExactTokens(uint256 amountOut, uint256 amountInMax, address[] calldata path, address to) external payable returns (uint256 amountIn)",
        "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)",
        "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)",
        "function exactOutput((bytes path, address recipient, uint256 amountOut, uint256 amountInMaximum) params) external payable returns (uint256 amountIn)",
        "function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountIn)",
    ],
    PANCAKE_ROUTER_ABI: [
        "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)",
        "function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)",
        "function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountIn)",
        "function exactOutput((bytes path, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum) params) external payable returns (uint256 amountIn)",
    ],
    ERC20_ABI: [
        "function transfer(address to, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function balanceOf(address account) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function symbol() view returns (string memory)",
        "function deposit() external payable",
        ,
    ],
};
