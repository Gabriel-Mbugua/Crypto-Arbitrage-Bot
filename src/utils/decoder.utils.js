import { ethers } from "ethers";

const TRANSFER_INTERFACE = new ethers.Interface([
    "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

export const parseERC20Logs = (receipt) => {
    return receipt.logs
        .filter((log) => {
            try {
                return TRANSFER_INTERFACE.parseLog(log) !== null;
            } catch {
                return false;
            }
        })
        .map((log) => {
            const { args } = TRANSFER_INTERFACE.parseLog(log);
            return {
                token: log.address,
                from: args.from,
                to: args.to,
                value: args.value,
            };
        });
};
