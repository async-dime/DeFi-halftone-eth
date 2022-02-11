const { ethers } = require('hardhat');
require('dotenv').config({ path: '.env' });
const { HALFTONE_ETH_TOKEN_CONTRACT_ADDRESS } = require('../constants');

const main = async () => {
  const halftoneEthTokenAddress = HALFTONE_ETH_TOKEN_CONTRACT_ADDRESS;
  /*
  A ContractFactory in ethers.js is an abstraction used to deploy new smart contracts,
  so exchangeContract here is a factory for instances of our Exchange contract.
  */
  const exchangeContract = await ethers.getContractFactory('Exchange');

  // here we deploy the contract
  const deployedExchangeContract = await exchangeContract.deploy(
    halftoneEthTokenAddress
  );

  // print the address of the deployed contract
  console.log('Exchange Contract Address:', deployedExchangeContract.address);
};

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (err) {
    console.error('Error deploying the DeFi Exchange contract', err);
    process.exit(1);
  }
};

runMain();
