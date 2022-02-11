// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Exchange is ERC20 {
    address public halftoneEthTokenAddress;

    // Exchange is inheriting ERC20, because our exchange would keep track of Halftone Eth LP Token
    constructor(address _HalftoneEthtoken)
        ERC20("HalftoneEth LP Token", "HETLP")
    {
        require(
            _HalftoneEthtoken != address(0),
            "Token address passed is a null address"
        );
        halftoneEthTokenAddress = _HalftoneEthtoken;
    }

    /**
     * @dev Returns the amount of `Halftone Eth Tokens` held by the contract
     */
    function getReserve() public view returns (uint256) {
        return ERC20(halftoneEthTokenAddress).balanceOf(address(this));
    }

    /**
     * @dev Adds liquidity to the exchange.
     */
    function addLiquidity(uint256 _amount) public payable returns (uint256) {
        uint256 liquidity;
        uint256 ethBalance = address(this).balance;
        uint256 halftoneEthTokenReserve = getReserve();
        ERC20 halftoneEthToken = ERC20(halftoneEthTokenAddress);
        /**
         * If the reserve is empty, intake any user supplied value
         * for `Ether` and `Halftone Eth` tokens because there is no ratio currently
         */
        if (halftoneEthTokenReserve == 0) {
            // Transfer the `halftoneEthToken` from the user's account to the contract
            halftoneEthToken.transferFrom(msg.sender, address(this), _amount);
            // Take the current ethBalance and mint `ethBalance` amount of LP tokens to the user
            // `liquidity` provided is equal to `ethBalance` because this is the first time user
            // is adding`Eth` to the contract, so whatever `Eth` contract has is equal to the onle supplied
            // by the user in the current `addLiquidity` call
            // `liquidity` tokens that need to be minted to the user on `addLiquidity` call should always be proportional
            // to the eth specified by the user
            liquidity = ethBalance;
            _mint(msg.sender, liquidity);
            // _mint is ERC20.sol function that mints `liquidity` amount of ERC20 LP tokens to the user
        } else {
            /**
              If the reserve is not empty, intake any user supplied value for
              `Ether` and determine according to the ratio of how many `HalftoneEth` tokens
              need to be supplied to prevent any large price impacts because of the additional liquidity 
              */
            // ethReserve should be the current ethBalance subtracted by the amount of `Eth` sent by the user
            // in the current `addLiquidity` call
            uint256 ethReserve = ethBalance - msg.value;
            // Ratio should always be maintained so that there are no major price impacts when adding liquidity
            // Ratio here is -> (halftoneEthTokenAmount user can add /halftoneEthTokenReserve in the contract) = (Eth sent by the user / Eth reserve in the contract)
            // So doing some maths, (halftoneEthTokenAmount user can add ) = (Eth sent by the user * halftoneEthTokenReserve / Eth reserve)
            uint256 halftoneEthTokenAmount = (msg.value *
                halftoneEthTokenReserve) / (ethReserve);
            require(
                _amount >= halftoneEthTokenAmount,
                "Amount of tokens sent is less than the required amount"
            );
            // transfer only (halftoneEthTokenAmount user can add) amount of `Halftone Eth tokens` from users account
            // to the contract
            halftoneEthToken.transferFrom(
                msg.sender,
                address(this),
                halftoneEthTokenAmount
            );
            // The amount of LP tokens that would be sent to the user should be proportional to the liquidity of ether sent by the user
            // Ratio here to be maintained is ->
            // (LP tokens to be sent to the user(liquidity)/ totalSupply of LP tokens in contract) = (eth sent by the user)/(eth reserve in the contract)
            // By some maths -> liquidity =  (totalSupply of LP tokens in contract * (eth sent by the user))/(eth reserve in the contract)
            liquidity = (totalSupply() * msg.value) / ethReserve;
            _mint(msg.sender, liquidity);
        }
        return liquidity;
    }

    /**
@dev Returns the amount Eth/Halftone Eth tokens that would be returned to the user
* in the swap
*/
    function removeLiquidity(uint256 _amount)
        public
        returns (uint256, uint256)
    {
        require(_amount > 0, "_amount should be greater than zero");
        uint256 ethReserve = address(this).balance;
        uint256 _totalSupply = totalSupply();
        // The amount of Eth that would be sent back to the user is based
        // on a ratio
        // Ratio is -> (Eth sent back to the user/ Current Eth reserve)
        // = (amount of LP tokens that user wants to withdraw)/ Total supply of `LP` tokens
        // Then by some maths -> (Eth sent back to the user)
        // = (Current Eth reserve * amount of LP tokens that user wants to withdraw)/Total supply of `LP` tokens
        uint256 ethAmount = (ethReserve * _amount) / _totalSupply;
        // The amount of Halftone Eth token that would be sent back to the user is based
        // on a ratio
        // Ratio is -> (Halftone Eth sent back to the user/ Current Halftone Eth token reserve)
        // = (amount of LP tokens that user wants to withdraw)/ Total supply of `LP` tokens
        // Then by some maths -> (Halftone Eth sent back to the user/)
        // = (Current Halftone Eth token reserve * amount of LP tokens that user wants to withdraw)/Total supply of `LP` tokens
        uint256 halftoneEthTokenAmount = (getReserve() * _amount) /
            _totalSupply;
        // Burn the sent `LP` tokens from the user'a wallet because they are already sent to
        // remove liquidity
        _burn(msg.sender, _amount);
        // Transfer `ethAmount` of Eth from user's wallet to the contract
        payable(msg.sender).transfer(ethAmount);
        // Transfer `halftoneEthTokenAmount` of `Halftone Eth` tokens from the user's wallet to the contract
        ERC20(halftoneEthTokenAddress).transfer(
            msg.sender,
            halftoneEthTokenAmount
        );
        return (ethAmount, halftoneEthTokenAmount);
    }

    /** 
    @dev Returns the amount Eth/Halftone Eth tokens that would be returned to the user
    * in the swap
    */
    function getAmountOfTokens(
        uint256 inputAmount,
        uint256 inputReserve,
        uint256 outputReserve
    ) public pure returns (uint256) {
        require(inputReserve > 0 && outputReserve > 0, "invalid reserves");
        // We are charging a fees of `1%`
        // Input amount with fees = (input amount - (1*(input amount)/100)) = ((input amount)*99)/100
        uint256 inputAmountWithFee = inputAmount * 99;
        // Because we need to follow the concept of `XY = K` curve
        // We need to make sure (x + Δx)*(y - Δy) = (x)*(y)
        // so the final formulae is Δy = (y*Δx)/(x + Δx);
        // Δy in our case is `tokens to be recieved`
        // Δx = ((input amount)*99)/100, x = inputReserve, y = outputReserve
        // So by putting the values in the formulae you can get the numerator and denominator
        uint256 numerator = inputAmountWithFee * outputReserve;
        uint256 denominator = (inputReserve * 100) + inputAmountWithFee;
        return numerator / denominator;
    }

    /** 
    @dev Swaps Ether for HalftoneEth Tokens
    */
    function ethToHalftoneEthToken(uint256 _minTokens) public payable {
        uint256 tokenReserve = getReserve();
        // call the `getAmountOfTokens` to get the amount of halftone eth tokens
        // that would be returned to the user after the swap
        // Notice that the `inputReserve` we are sending is equal to
        //  `address(this).balance - msg.value` instead of just `address(this).balance`
        // because `address(this).balance` already contains the `msg.value` user has sent in the given call
        // so we need to subtract it to get the actual input reserve
        uint256 tokensBought = getAmountOfTokens(
            msg.value,
            address(this).balance - msg.value,
            tokenReserve
        );

        require(tokensBought >= _minTokens, "insufficient output amount");
        // Transfer the `Halftone Eth` tokens to the user
        ERC20(halftoneEthTokenAddress).transfer(msg.sender, tokensBought);
    }

    /** 
    @dev Swaps HalftoneEth Tokens for Ether
    */
    function halftoneEthTokenToEth(uint256 _tokensSold, uint256 _minEth)
        public
    {
        uint256 tokenReserve = getReserve();
        // call the `getAmountOfTokens` to get the amount of ether
        // that would be returned to the user after the swap
        uint256 ethBought = getAmountOfTokens(
            _tokensSold,
            tokenReserve,
            address(this).balance
        );
        require(ethBought >= _minEth, "insufficient output amount");
        // Transfer `Halftone Eth` tokens from the user's address to the contract
        ERC20(halftoneEthTokenAddress).transferFrom(
            msg.sender,
            address(this),
            _tokensSold
        );
        // send the `ethBought` to the user from the contract
        payable(msg.sender).transfer(ethBought);
    }
}
