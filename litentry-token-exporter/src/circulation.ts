import { ethers } from "ethers";
const { BigNumber } = require("@ethersproject/bignumber");
// import { BigNumber } from "@ethersproject/bignumber";

const ECOSYSTEM_ADDRESS = "0x9cdf4e1347328416daf17335caf6a314201cc1dd";
const TEAM_ADDRESS = "0x65e4a77536d47bf42db6817373939a63c00a0904";
const FOUNDATION_ADDRESS = "0xd481e3499c8ef073913513073c97d4d89bb9797e";
const BRIDGE_ADDRESS = "0x11bce4536296c81d1a291b1ffbe292fdd55a3a89";

const LIT = {
  eth: "0xb59490aB09A0f526Cc7305822aC65f2Ab12f9723",
  bsc: "0xb59490ab09a0f526cc7305822ac65f2ab12f9723",
};

function getAccount(rpcUrl: string) {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  // NOTE!!! It's a random private key, don't store assets inside it
  const PRIVATE_KEY =
    "7c08043c8446945f1804120421a2efcfd82e53f5168c4569b22296aee533af3b";

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  const account = wallet.connect(provider);
  return account;
}

function getEthAccount() {
  return getAccount(
    "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
  );
}

function getBSCAccount() {
  return getAccount("https://bsc-dataseed.binance.org");
}

const ethAccount = getEthAccount();
const bscAccount = getBSCAccount();

async function ethLockedInfo() {
  const abi = {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  };

  const lit = new ethers.Contract(LIT.eth, [abi], ethAccount);
  const tasks = [
    lit.balanceOf(ECOSYSTEM_ADDRESS),
    lit.balanceOf(TEAM_ADDRESS),
    lit.balanceOf(FOUNDATION_ADDRESS),
    lit.balanceOf(BRIDGE_ADDRESS),
  ];
  const rets = await Promise.all(tasks);
  const balanceOf = {
    ecosystem: tasks[0],
    team: tasks[1],
    foundation: tasks[2],
    bridge: tasks[3],
  };

  console.log(balanceOf);
  return balanceOf;
}
async function bscLockedInfo() {
  return {};
}
async function ethTotalSupply() {
  const abi = {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  };

  const lit = new ethers.Contract(LIT.eth, [abi], ethAccount);
  const totalSupply = await lit.totalSupply();
  console.log("eth: ", totalSupply.toString());
  return totalSupply;
}

async function bscTotalSupply() {
  const abi = {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  };

  const lit = new ethers.Contract(LIT.bsc, [abi], bscAccount);
  const totalSupply = await lit.totalSupply();
  console.log("bsc: ", totalSupply.toString());
  return totalSupply;
}

// TODO: Add parachain information
ethTotalSupply();
bscTotalSupply();
ethLockedInfo();
bscLockedInfo();
