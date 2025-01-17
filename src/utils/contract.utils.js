const getBalances = async (tokenContract, walletAddress, decimals) => {
    const balance = await tokenContract.balanceOf(walletAddress);
    return {
        raw: balance,
        formatted: ethers.formatUnits(balance, decimals),
    };
};
