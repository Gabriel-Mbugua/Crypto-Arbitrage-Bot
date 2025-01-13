import express from "express";
import { dexListener } from "./src/listener/index.js";

const app = express();
const port = process.env.PORT || 3000;

const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

let monitoringInterval;

const monitorArbitrage = async () => {
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

const startBot = () => {
    console.log("Starting bot monitoring...");
    // Clear any existing interval
    if (monitoringInterval) clearInterval(monitoringInterval);
    // Start immediate first run
    monitorArbitrage();
    // Set up interval
    monitoringInterval = setInterval(monitorArbitrage, 60 * 1000);
};

app.get("/", (req, res) => {
    res.send("Bot is running");
});

// manually start the bot
app.get("/start", (req, res) => {
    startBot();
    res.send("Bot monitoring started");
});

// Start the server
const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    // Start the bot when server starts
    startBot();
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
    console.log("SIGTERM received. Performing graceful shutdown...");
    if (monitoringInterval) clearInterval(monitoringInterval);
    server.close(() => {
        console.log("Server closed");
        process.exit(0);
    });
});

process.on("SIGINT", () => {
    console.log("SIGINT received. Performing graceful shutdown...");
    if (monitoringInterval) clearInterval(monitoringInterval);
    server.close(() => {
        console.log("Server closed");
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    // Restart the bot
    startBot();
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    // Restart the bot
    startBot();
});
