import express from "express";
import { dexListener } from "./src/listener/index.js";

const app = express();
const port = process.env.PORT || 3000;

const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const monitorArbitrage = async () => {
    console.log("Initializing bot...");
    const params = {
        network: "base",
        tokenIn: USDC_ADDRESS,
        tokenOut: WETH_ADDRESS,
        amountIn: "0.1",
    };

    try {
        const result = await dexListener.monitorPrices(params);
        if (result) console.log("Arbitrage executed!", JSON.stringify(result));
        if (!result) console.log("No profitable arbitrage opportunity found");
    } catch (error) {
        console.error("Error monitoring arbitrage:", error);
    }
};
const INTERVAL_MS = 60 * 1000; // Run every 60 seconds
setInterval(monitorArbitrage, INTERVAL_MS);

monitorArbitrage();

// Add basic health check endpoint
app.get("/", (req, res) => {
    res.send("Bot is running");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
