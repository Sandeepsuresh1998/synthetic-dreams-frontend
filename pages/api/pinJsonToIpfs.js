const pinataSDK = require('@pinata/sdk');
const pinata = new pinataSDK({ pinataJWTKey:
    process.env.PINATA_JWT
});

export default async function handler(_req, res) {
    console.log(_req.body.metadata)
    const response = await pinata.pinJSONToIPFS(
        _req.body.metadata,
        {
            pinataOptions: {cidVersion: 1},
            pinataMetadata: {name: _req.body.description},
        }
    )
    res.status(200).json(
        {
            ipfs_uri: "ipfs://" + response.IpfsHash
        }
    )
}

