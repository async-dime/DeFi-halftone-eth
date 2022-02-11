import { Contract, providers, utils, BigNumber } from 'ethers';
import { EXCHANGE_CONTRACT_ABI, EXCHANGE_CONTRACT_ADDRESS } from '../constants';

/**
 * removeLiquidity: Removes the `removeLPTokensWei` amount of LP tokens from
 * liquidity and also the calculated amount of `ether` and `HET` tokens
 */
export const removeLiquidity = async (signer, removeLPTokensWei) => {
  // Create a new instance of the exchange contract
  const exchangeContract = new Contract(
    EXCHANGE_CONTRACT_ADDRESS,
    EXCHANGE_CONTRACT_ABI,
    signer
  );
  const tx = await exchangeContract.removeLiquidity(removeLPTokensWei);
  await tx.wait();
};

/**
 * getTokensAfterRemove: Calculates the amount of `Ether` and `HET` tokens
 * that would be returned back to user after he removes `removeLPTokenWei` amount
 * of LP tokens from the contract
 */
export const getTokensAfterRemove = async (
  provider,
  removeLPTokenWei,
  _ethBalance,
  halftoneEthTokenReserve
) => {
  try {
    // Create a new instance of the exchange contract
    const exchangeContract = new Contract(
      EXCHANGE_CONTRACT_ADDRESS,
      EXCHANGE_CONTRACT_ABI,
      provider
    );
    // Get the total supply of `Halftone Eth` LP tokens
    const _totalSupply = await exchangeContract.totalSupply();
    // Here we are using the BigNumber methods of multiplication and division
    // The amount of ether that would be sent back to the user after he withdraws the LP token
    // id calculated based on a ratio,
    // Ratio is -> (amount of ether that would be sent back to the user/ Eth reserves) = (LP tokens withdrawn)/(Total supply of LP tokens)
    // By some maths we get -> (amount of ether that would be sent back to the user) = (Eth Reserve * LP tokens withdrawn)/(Total supply of LP tokens)
    // Similarly we also maintain a ratio for the `HET` tokens, so here in our case
    // Ratio is -> (amount of HET tokens sent back to the user/ HET Token reserve) = (LP tokens withdrawn)/(Total supply of LP tokens)
    // Then (amount of HET tokens sent back to the user) = (HET token reserve * LP tokens withdrawn)/(Total supply of LP tokens)
    const _removeEther = _ethBalance.mul(removeLPTokenWei).div(_totalSupply);
    const _removeHET = halftoneEthTokenReserve
      .mul(removeLPTokenWei)
      .div(_totalSupply);
    return {
      _removeEther,
      _removeHET,
    };
  } catch (err) {
    console.error(err);
  }
};
