import got from 'got';
const pinataSDK = require('@pinata/sdk');
const pinata = new pinataSDK({ pinataJWTKey:
    process.env.PINATA_JWT,
});

export default async function handler(_req, res) {
    console.log(_req.body.image_uri);
    const stream = got.stream(_req.body.image_uri);
    const options = {
        pinataMetadata: {
            name: _req.body.description
        },
        pinataOptions: {
            cidVersion: 1,
        }
    }
    const response = await pinata.pinFileToIPFS(stream, options)    
    res.status(200).json(
        {
            ipfs_uri: "ipfs://" + response.IpfsHash
        }
    )
}

