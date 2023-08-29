// Create Dalle2 Instance
import {Configuration, OpenAIApi} from "openai";

const configuration = new Configuration({
    apiKey: process.env.DALLE_SK,
});
const openai = new OpenAIApi(configuration);

export default async function handler(_req, res) {
    const response = await openai.createImage({
        prompt: _req.body.prompt,
        n: 1,
        size: "1024x1024",
        user: _req.body.user,
    });
    const url = response.data.data[0].url
    res.status(200).json({
        image_uris: [url]
    })
}