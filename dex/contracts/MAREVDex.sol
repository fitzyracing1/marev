// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MAREVDex is Ownable, ReentrancyGuard {
    IERC20 public marevToken;
    IERC20 public usdcToken;

    uint256 public constant FEE_PERCENT = 25; // 0.25% fee
    uint256 public feeCollected;
    address public feeRecipient;

    event Swap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );

    event LiquidityAdded(
        address indexed provider,
        uint256 marevAmount,
        uint256 usdcAmount
    );

    event LiquidityRemoved(
        address indexed provider,
        uint256 marevAmount,
        uint256 usdcAmount
    );

    constructor(address _marev, address _usdc, address _feeRecipient) Ownable(msg.sender) {
        marevToken = IERC20(_marev);
        usdcToken = IERC20(_usdc);
        feeRecipient = _feeRecipient;
    }

    function getPrice(address tokenIn, address tokenOut, uint256 amountIn)
        public
        view
        returns (uint256)
    {
        // Simple AMM formula: x * y = k
        // Price = (y * amountIn) / (x + amountIn)
        uint256 reserveIn = tokenIn == address(marevToken)
            ? marevToken.balanceOf(address(this))
            : usdcToken.balanceOf(address(this));

        uint256 reserveOut = tokenOut == address(marevToken)
            ? marevToken.balanceOf(address(this))
            : usdcToken.balanceOf(address(this));

        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");

        uint256 amountInWithFee = amountIn * (10000 - FEE_PERCENT) / 10000;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn + amountInWithFee;

        return numerator / denominator;
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) public nonReentrant returns (uint256 amountOut) {
        require(tokenIn != tokenOut, "Invalid token pair");
        require(
            (tokenIn == address(marevToken) && tokenOut == address(usdcToken)) ||
            (tokenIn == address(usdcToken) && tokenOut == address(marevToken)),
            "Invalid tokens"
        );

        // Calculate output amount
        amountOut = getPrice(tokenIn, tokenOut, amountIn);
        require(amountOut >= minAmountOut, "Slippage too high");

        // Calculate fee
        uint256 fee = (amountIn * FEE_PERCENT) / 10000;

        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(msg.sender, amountOut);

        feeCollected += fee;

        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, fee);

        return amountOut;
    }

    function swapMARtoUSDC(uint256 amountMAREV, uint256 minUSDC)
        public
        returns (uint256)
    {
        return swap(address(marevToken), address(usdcToken), amountMAREV, minUSDC);
    }

    function swapUSDCtoMAR(uint256 amountUSDC, uint256 minMAREV)
        public
        returns (uint256)
    {
        return swap(address(usdcToken), address(marevToken), amountUSDC, minMAREV);
    }

    function addLiquidity(uint256 marevAmount, uint256 usdcAmount)
        public
        nonReentrant
        returns (bool)
    {
        require(marevAmount > 0 && usdcAmount > 0, "Amount must be > 0");

        marevToken.transferFrom(msg.sender, address(this), marevAmount);
        usdcToken.transferFrom(msg.sender, address(this), usdcAmount);

        emit LiquidityAdded(msg.sender, marevAmount, usdcAmount);
        return true;
    }

    function getReserves() public view returns (uint256 marevReserve, uint256 usdcReserve) {
        marevReserve = marevToken.balanceOf(address(this));
        usdcReserve = usdcToken.balanceOf(address(this));
    }

    function collectFees() public onlyOwner {
        require(feeCollected > 0, "No fees to collect");
        uint256 fees = feeCollected;
        feeCollected = 0;
        // Fees could be sent to feeRecipient or used for other purposes
    }

    function setFeeRecipient(address _feeRecipient) public onlyOwner {
        feeRecipient = _feeRecipient;
    }
}
