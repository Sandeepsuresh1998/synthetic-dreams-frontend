const ethers = require('ethers');

// Get Alchemy API Key
const API_KEY = process.env.API_KEY;
// Define an Alchemy Provider
const provider = new ethers.providers.AlchemyProvider('goerli', API_KEY)
//Get contract abi
const contract = require("./SyntheticDreams.json");
// Create a signer
const privateKey = process.env.PRIVATE_KEY
const signer = new ethers.Wallet(privateKey, provider)
// Get contract ABI and address
const abi = contract.abi
const contractAddress =  process.env.CONTRACT_ADDRESS

// Create a contract instance
export const aiNFTContract = new ethers.Contract(contractAddress, abi, signer)
