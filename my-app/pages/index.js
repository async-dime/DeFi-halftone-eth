import { BigNumber, providers, utils } from 'ethers';
import Head from 'next/head';
import React, { useEffect, useRef, useState } from 'react';
import Web3Modal from 'web3modal';
import styles from '../styles/Home.module.css';
import { addLiquidity, calculateHET } from '../utils/addLiquidity';
import {
  getHETTokensBalance,
  getEtherBalance,
  getLPTokensBalance,
  getReserveOfHETTokens,
} from '../utils/getAmounts';
import {
  getTokensAfterRemove,
  removeLiquidity,
} from '../utils/removeLiquidity';
import { swapTokens, getAmountOfTokensReceivedFromSwap } from '../utils/swap';

export default function Home() {
  /** General state variables */
  // loading is set to true when the transaction is mining and set to false when the transaction has mined
  const [loading, setLoading] = useState(false);
  // We have two tabs in this dapp, Liquidity Tab and Swap Tab. This variable keeps track of which Tab the user is on
  // If it is set to true this means that the user is on `liquidity` tab else he is on `swap` tab
  const [liquidityTab, setLiquidityTab] = useState(true);
  // This variable is the `0` number in form of a BigNumber
  const zero = BigNumber.from(0);
  /** Variables to keep track of amount */
  // `ethBalance` keeps track of the amount of Eth held by the user's account
  const [ethBalance, setEtherBalance] = useState(zero);
  // `reservedHET` keeps track of the Halftone Eth tokens Reserve balance in the Exchange contract
  const [reservedHET, setReservedHET] = useState(zero);
  // Keeps track of the ether balance in the contract
  const [etherBalanceContract, setEtherBalanceContract] = useState(zero);
  // hetBalance is the amount of `HET` tokens help by the users account
  const [hetBalance, setHETBalance] = useState(zero);
  // `lpBalance` is the amount of LP tokens held by the users account
  const [lpBalance, setLPBalance] = useState(zero);
  /** Variables to keep track of liquidity to be added or removed */
  // addEther is the amount of Ether that the user wants to add to the liquidity
  const [addEther, setAddEther] = useState(zero);
  // addHETTokens keeps track of the amount of HET tokens that the user wants to add to the liquidity
  // in case when there is no initial liquidity and after liquidity gets added it keeps track of the
  // HET tokens that the user can add given a certain amount of ether
  const [addHETTokens, setAddHETTokens] = useState(zero);
  // removeEther is the amount of `Ether` that would be sent back to the user based on a certain number of `LP` tokens
  const [removeEther, setRemoveEther] = useState(zero);
  // removeHET is the amount of `Halftone Eth` tokens that would be sent back to the user base on a certain number of `LP` tokens
  // that he wants to withdraw
  const [removeHET, setRemoveHET] = useState(zero);
  // amount of LP tokens that the user wants to remove from liquidity
  const [removeLPTokens, setRemoveLPTokens] = useState('0');
  /** Variables to keep track of swap functionality */
  // Amount that the user wants to swap
  const [swapAmount, setSwapAmount] = useState('');
  // This keeps track of the number of tokens that the user would receive after a swap completes
  const [tokenToBeReceivedAfterSwap, setTokenToBeReceivedAfterSwap] =
    useState(zero);
  // Keeps track of whether  `Eth` or `Halftone Eth` token is selected. If `Eth` is selected it means that the user
  // wants to swap some `Eth` for some `Halftone Eth` tokens and vice versa if `Eth` is not selected
  const [ethSelected, setEthSelected] = useState(true);
  /** Wallet connection */
  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef = useRef();
  // walletConnected keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);

  const TWITTER_HANDLE = 'p0tat0H8';
  const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

  /**
   * getAmounts call various functions to retrieve amounts for ethBalance,
   * LP tokens etc
   */
  const getAmounts = async () => {
    try {
      const provider = await getProviderOrSigner(false);
      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();
      // get the amount of eth in the user's account
      const _ethBalance = await getEtherBalance(provider, address);
      // get the amount of `Halftone Eth` tokens held by the user
      const _hetBalance = await getHETTokensBalance(provider, address);
      // get the amount of `Halftone Eth` LP tokens held by the user
      const _lpBalance = await getLPTokensBalance(provider, address);
      // gets the amount of `HET` tokens that are present in the reserve of the `Exchange contract`
      const _reservedHET = await getReserveOfHETTokens(provider);
      // Get the ether reserves in the contract
      const _ethBalanceContract = await getEtherBalance(provider, null, true);
      setEtherBalance(_ethBalance);
      setHETBalance(_hetBalance);
      setLPBalance(_lpBalance);
      setReservedHET(_reservedHET);
      setReservedHET(_reservedHET);
      setEtherBalanceContract(_ethBalanceContract);
    } catch (err) {
      console.error(err);
    }
  };

  /**** SWAP FUNCTIONS ****/

  /*
  swapTokens: Swaps  `swapAmountWei` of Eth/Halftone Eth tokens with `tokenToBeReceivedAfterSwap` amount of Eth/Halftone Eth tokens.
*/
  const _swapTokens = async () => {
    try {
      // Convert the amount entered by the user to a BigNumber using the `parseEther` library from `ethers.js`
      const swapAmountWei = utils.parseEther(swapAmount);
      // Check if the user entered zero
      // We are here using the `eq` method from BigNumber class in `ethers.js`
      if (!swapAmountWei.eq(zero)) {
        const signer = await getProviderOrSigner(true);
        setLoading(true);
        // Call the swapTokens function from the `utils` folder
        await swapTokens(
          signer,
          swapAmountWei,
          tokenToBeReceivedAfterSwap,
          ethSelected
        );
        setLoading(false);
        // Get all the updated amounts after the swap
        await getAmounts();
        setSwapAmount('');
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setSwapAmount('');
    }
  };

  /*
    _getAmountOfTokensReceivedFromSwap:  Returns the number of Eth/Halftone Eth tokens that can be received 
    when the user swaps `_swapAmountWEI` amount of Eth/Halftone Eth tokens.
 */
  const _getAmountOfTokensReceivedFromSwap = async (_swapAmount) => {
    try {
      // Convert the amount entered by the user to a BigNumber using the `parseEther` library from `ethers.js`
      const _swapAmountWEI = utils.parseEther(_swapAmount.toString());
      // Check if the user entered zero
      // We are here using the `eq` method from BigNumber class in `ethers.js`
      if (!_swapAmountWEI.eq(zero)) {
        const provider = await getProviderOrSigner();
        // Get the amount of ether in the contract
        const _ethBalance = await getEtherBalance(provider, null, true);
        // Call the `getAmountOfTokensReceivedFromSwap` from the utils folder
        const amountOfTokens = await getAmountOfTokensReceivedFromSwap(
          _swapAmountWEI,
          provider,
          ethSelected,
          _ethBalance,
          reservedHET
        );
        setTokenToBeReceivedAfterSwap(amountOfTokens);
      } else {
        setTokenToBeReceivedAfterSwap(zero);
      }
    } catch (err) {
      console.error(err);
    }
  };

  /*** END ***/

  /**** ADD LIQUIDITY FUNCTIONS ****/

  /**
   * _addLiquidity helps add liquidity to the exchange,
   * If the user is adding initial liquidity, user decides the ether and HET tokens he wants to add
   * to the exchange. If we he adding the liquidity after the initial liquidity has already been added
   * then we calculate the halftone eth tokens he can add, given the eth he wants to add by keeping the ratios
   * constant
   */
  const _addLiquidity = async () => {
    try {
      // Convert the ether amount entered by the user to Bignumber
      const addEtherWei = utils.parseEther(addEther.toString());
      // Check if the values are zero
      if (!addHETTokens.eq(zero) && !addEtherWei.eq(zero)) {
        const signer = await getProviderOrSigner(true);
        setLoading(true);
        // call the addLiquidity function from the utils folder
        await addLiquidity(signer, addHETTokens, addEtherWei);
        setLoading(false);
        // Reinitialize the HET tokens
        setAddHETTokens(zero);
        // Get amounts for all values after the liquidity has been added
        await getAmounts();
      } else {
        setAddHETTokens(zero);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setAddHETTokens(zero);
    }
  };

  /**** END ****/

  /**** REMOVE LIQUIDITY FUNCTIONS ****/

  /**
   * _removeLiquidity: Removes the `removeLPTokensWei` amount of LP tokens from
   * liquidity and also the calculated amount of `ether` and `HET` tokens
   */
  const _removeLiquidity = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      // Convert the LP tokens entered by the user to a BigNumber
      const removeLPTokensWei = utils.parseEther(removeLPTokens);
      setLoading(true);
      // Call the removeLiquidity function from the `utils` folder
      await removeLiquidity(signer, removeLPTokensWei);
      setLoading(false);
      await getAmounts();
      setRemoveHET(zero);
      setRemoveEther(zero);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setRemoveHET(zero);
      setRemoveEther(zero);
    }
  };

  /**
   * _getTokensAfterRemove: Calculates the amount of `Ether` and `HET` tokens
   * that would be returned back to user after he removes `removeLPTokenWei` amount
   * of LP tokens from the contract
   */
  const _getTokensAfterRemove = async (_removeLPTokens) => {
    try {
      const provider = await getProviderOrSigner();
      // Convert the LP tokens entered by the user to a BigNumber
      const removeLPTokenWei = utils.parseEther(_removeLPTokens);
      // Get the Eth reserves within the exchange contract
      const _ethBalance = await getEtherBalance(provider, null, true);
      // get the halftone eth token reserves from the contract
      const halftoneEthTokenReserve = await getReserveOfHETTokens(provider);
      // call the getTokensAfterRemove from the utils folder
      const { _removeEther, _removeHET } = await getTokensAfterRemove(
        provider,
        removeLPTokenWei,
        _ethBalance,
        halftoneEthTokenReserve
      );
      setRemoveEther(_removeEther);
      setRemoveHET(_removeHET);
    } catch (err) {
      console.error(err);
    }
  };

  /**** END ****/

  /*
      connectWallet: Connects the MetaMask wallet
  */
  const connectWallet = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // When used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Returns a Provider or Signer object representing the Ethereum RPC with or without the
   * signing capabilities of metamask attached
   *
   * A `Provider` is needed to interact with the blockchain - reading transactions, reading balances, reading state, etc.
   *
   * A `Signer` is a special type of Provider used in case a `write` transaction needs to be made to the blockchain, which involves the connected account
   * needing to make a digital signature to authorize the transaction being sent. Metamask exposes a Signer API to allow your website to
   * request signatures from the user using Signer functions.
   *
   * @param {*} needSigner - True if you need the signer, default false otherwise
   */
  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Rinkeby network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert('Change the network to Rinkeby');
      throw new Error('Change network to Rinkeby');
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  // useEffects are used to react to changes in state of the website
  // The array at the end of function call represents what state changes will trigger this effect
  // In this case, whenever the value of `walletConnected` changes - this effect will be called
  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting it's `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: 'rinkeby',
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getAmounts();
    }
  }, [walletConnected]);

  /*
      renderButton: Returns a button based on the state of the dapp
  */
  const renderButton = () => {
    // If wallet is not connected, return a button which allows them to connect their wllet
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }

    // If we are currently waiting for something, return a loading button
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }

    if (liquidityTab) {
      return (
        <div>
          <div className={styles.description}>
            You have:
            <br />
            {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
            {utils.formatEther(hetBalance)} Halftone Eth Tokens
            <br />
            {utils.formatEther(ethBalance)} Ether
            <br />
            {utils.formatEther(lpBalance)} Halftone Eth LP tokens
          </div>
          <div>
            {/* If reserved HET is zero, render the state for liquidity zero where we ask the user
            who much initial liquidity he wants to add else just render the state where liquidity is not zero and
            we calculate based on the `Eth` amount specified by the user how much `HET` tokens can be added */}
            {utils.parseEther(reservedHET.toString()).eq(zero) ? (
              <div>
                <input
                  type="number"
                  placeholder="Amount of Ether"
                  onChange={(e) => setAddEther(e.target.value || '0')}
                  className={styles.input}
                />
                <input
                  type="number"
                  placeholder="Amount of HalftoneEth tokens"
                  onChange={(e) =>
                    setAddHETTokens(
                      BigNumber.from(utils.parseEther(e.target.value || '0'))
                    )
                  }
                  className={styles.input}
                />
                <button className={styles.button1} onClick={_addLiquidity}>
                  Add
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="number"
                  placeholder="Amount of Ether"
                  onChange={async (e) => {
                    setAddEther(e.target.value || '0');
                    // calculate the number of HET tokens that
                    // can be added given  `e.target.value` amount of Eth
                    const _addHETTokens = await calculateHET(
                      e.target.value || '0',
                      etherBalanceContract,
                      reservedHET
                    );
                    setAddHETTokens(_addHETTokens);
                  }}
                  className={styles.input}
                />
                <div className={styles.inputDiv}>
                  {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
                  {`You will need ${utils.formatEther(
                    addHETTokens
                  )} Halftone Eth
                  Tokens`}
                </div>
                <button className={styles.button1} onClick={_addLiquidity}>
                  Add
                </button>
              </div>
            )}
            <div>
              <input
                type="number"
                placeholder="Amount of LP Tokens"
                onChange={async (e) => {
                  setRemoveLPTokens(e.target.value || '0');
                  // Calculate the amount of Ether and HET tokens that the user would receive
                  // After he removes `e.target.value` amount of `LP` tokens
                  await _getTokensAfterRemove(e.target.value || '0');
                }}
                className={styles.input}
              />
              <div className={styles.inputDiv}>
                {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
                {`You will get ${utils.formatEther(
                  removeHET
                )} Halftone Eth Tokens and ${utils.formatEther(
                  removeEther
                )} Eth`}
              </div>
              <button className={styles.button2} onClick={_removeLiquidity}>
                Remove
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div>
          <input
            type="number"
            placeholder="Amount"
            onChange={async (e) => {
              setSwapAmount(e.target.value || '');
              // Calculate the amount of tokens user would receive after the swap
              await _getAmountOfTokensReceivedFromSwap(e.target.value || '0');
            }}
            className={styles.input}
            value={swapAmount}
          />
          <select
            className={styles.select}
            name="dropdown"
            id="dropdown"
            onChange={async () => {
              setEthSelected(!ethSelected);
              // Initialize the values back to zero
              await _getAmountOfTokensReceivedFromSwap(0);
              setSwapAmount('');
            }}
          >
            <option value="eth">Ethereum</option>
            <option value="halftoneEthToken">Halftone Eth Token</option>
          </select>
          <br />
          <div className={styles.inputDiv}>
            {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
            {ethSelected
              ? `You will get ${utils.formatEther(
                  tokenToBeReceivedAfterSwap
                )} Halftone Eth Tokens`
              : `You will get ${utils.formatEther(
                  tokenToBeReceivedAfterSwap
                )} Eth`}
          </div>
          <button className={styles.button1} onClick={_swapTokens}>
            Swap
          </button>
        </div>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Halftone Eth</title>
        <meta name="description" content="Exchange-Dapp" />
        <link rel="icon" href="/halftone-ethx50.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.header}>Halftone-Eth Decentralized Exchange</h1>
          <div className={styles.description}>
            Exchange Ethereum &#60;&#62; Halftone Eth Tokens
          </div>
          <div>
            <button
              className={styles.button}
              onClick={() => {
                setLiquidityTab(!liquidityTab);
              }}
            >
              Liquidity
            </button>
            <button
              className={styles.button}
              onClick={() => {
                setLiquidityTab(false);
              }}
            >
              Swap
            </button>
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./00.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        <div>
          <img
            alt="Twitter Logo"
            className={styles.twitterLogo}
            src="./twitter.svg"
          />
          {'  '}
          <a
            className={styles.footerText}
            href={TWITTER_LINK}
            target="_blank"
            rel="noopener noreferrer"
          >
            <b>{`built by @${TWITTER_HANDLE}`}</b>
          </a>
        </div>
      </footer>
    </div>
  );
}
