const Web3 = require("web3")
var web3 = new Web3(Web3.givenProvider)


export default function hash(text) {
    return web3.utils.sha3(text);
}