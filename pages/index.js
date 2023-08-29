import React, { useState, useEffect, useCallback } from "react";
import Particles from "react-particles";
import { loadFull } from "tsparticles";
import {
  Typography,
  ThemeProvider,
  createTheme,
  Box,
  TextField,
  Button,
  Paper,
  Snackbar,
  Alert,
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import CssBaseline from "@mui/material/CssBaseline";
import text_to_hash from "../util/text_to_hash";
import contract from "../util/SyntheticDreams.json";
import { Magic } from "magic-sdk"
import { ConnectExtension } from "@magic-ext/connect";
import { ethers } from "ethers";
import ButtonAppBar from "../components/navbar";

const darkTheme = createTheme({
  palette: {
    primary: {
      // light: will be calculated from palette.primary.main,
      main: "#7d12ff",
    },
    mode: "dark",
  },
});

const MINT_PRICE = "0.03"

export default function Home() {
  const [alert, setAlert] = useState({
    msg: "",
    type: "success",
  });
  const [imageUrl, setImageUrl] = useState(null);
  const [isImageLoading, setIsLoading] = useState(false);
  const [textInput, setTextInput] = useState(null);
  const [address, setAddress ] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [magic, setMagic] = useState(null);
  const [provider, setProvider] = useState(null);
  const [walletType, setWalletType] = useState(null);
  const [isMintLoading, setMintLoading] = useState(false);

  function addWalletListener() {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          console.log("Address changed")
          setAddress(accounts[0]);
        } else {
          setAddress(null);
          setIsConnected(false);
        }
      });
    }
  }

  useEffect(() => {

    // Set Magic Instance
    const magicInstance = new Magic(
      process.env.MAGIC_PK_LIVE,
      {
        network: "mainnet",
        extensions: [new ConnectExtension()]
      }
    );
    const providerInstance = new ethers.providers.Web3Provider(magicInstance.rpcProvider);

    setMagic(magicInstance)
    setProvider(providerInstance)

    addWalletListener()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault();
    setImageUrl(null);
    const val = event.target.elements.prompt.value.trim();
    console.log("Going to generate image with: " + val)
    if (!val) return;
    setTextInput(val);

   
    try {
      if (!isConnected) {
        setAlert({
          msg: "Please connect your wallet first",
          type: "error",
        });
        return
      }
  
      setIsLoading(true);
      const imageResponse = await fetch("/api/textToImage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: val, user: address }),
      });
      const image_res = await imageResponse.json();
      const image_url = image_res["image_uris"][0]
      console.log(image_url);
      setImageUrl(image_url);
      setAlert({
        msg: "dreaming complete",
      });
    } catch (e) {
      setAlert({
        msg: "Error in dreaming process, please contact @sandeep98suresh on twitter",
        type: "error"
      });
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  const create_metadata = async () => {
    const baseIpfsUrl = "https://gateway.pinata.cloud/ipfs/";
    // Read-Only Contract instance
    const contractInstance = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      contract.abi,
      provider,
    )
    
    // Get IPFS link for the Image
    const pinFileResponse = await fetch("/api/pinFileToIpfs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        image_uri: imageUrl,
        description: textInput,
      }),
    });
    const imageRes = await pinFileResponse.json();
    const ipfsImageUrl = imageRes.ipfs_uri.replace("ipfs://", baseIpfsUrl);

    // Grab next token id
    let tokenId = await contractInstance.getCurrentToken()
    const newTokenId = tokenId.toNumber() + 1
    
    console.log("TokenID: ", newTokenId)
    
    // Contruct metadata with next token id
    const name = `Dream #${newTokenId}`
    var metadata = {
      name: name,
      description: textInput,
      image: ipfsImageUrl,
    };

    // Call api to pin metadata
    const pinJsonResponse = await fetch("/api/pinJsonToIpfs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        metadata: metadata,
        description: name, 
      }),
    });
    const metadataRes = await pinJsonResponse.json();

    const nft_metadata_uri = metadataRes.ipfs_uri.replace("ipfs://", baseIpfsUrl);
    console.log("Metadata URI", nft_metadata_uri)
    return nft_metadata_uri
  }

  const handleMint = async (event) => {
    event.preventDefault();
    const walletInfo = await magic.connect.getWalletInfo();
    console.log("Wallet Type", walletInfo.walletType);
    console.log("Contract Address", process.env.CONTRACT_ADDRESS);
    
    try {
      if (!isConnected) {
        setAlert({
          msg: "Please connect wallet!",
          type: "error"
        });
        return
      }

      setMintLoading(true)

      // Read Instance
      const alchemyProvider = new ethers.providers.AlchemyProvider("homestead", process.env.API_KEY)
      const provider_contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        contract.abi,
        alchemyProvider,
      )

      // Create hashed text for inputted text for smart contract
      const hashedText = text_to_hash(textInput);

      // Check if text is already taken
      const textIsTaken = await provider_contract.isTextMinted(hashedText)
      console.log("Text is taken: ", textIsTaken)

      if (textIsTaken) {
        setAlert({
          msg: "This dream has already been taken, please dream something else",
          type: "error", 
        });
        return
      }

      // Create metadata for new image
      const final_hashed_text = hashedText.valueOf()
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();

      // Options to be passed into mint call
      let overrideOptions = {
        value: ethers.utils.parseEther(MINT_PRICE),
      }

      // Create metadata for NFT
      const nft_metadata_uri = await create_metadata();
      if (walletInfo.walletType != "magic") {
        // Use alchemy provider directly, magic seems to fail
        // TODO: Change network based on prod vs int
        // Manually calculate gas and pass into wallet
        console.log("Starting gas estimation flow for non MC wallets")
        const mintGasFees = await provider_contract.estimateGas.mintToken(
            addr,
            nft_metadata_uri,
            final_hashed_text,
            {
              value: ethers.utils.parseEther(MINT_PRICE),
            },
        );
        
        overrideOptions = {
          gasLimit: mintGasFees,
          value: ethers.utils.parseEther(MINT_PRICE),
        }
      }

      // Preparing to mint
      const contractInstance = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        contract.abi,
        signer,
      )

      // Mint transaction
      const tx = await contractInstance.mintToken(addr,nft_metadata_uri,final_hashed_text, overrideOptions);
      const receipt = await tx.wait()
      console.log(receipt)
      setAlert({
        msg: "Minted!",
      });
    } catch (error) {
      console.log(error)
      setAlert({
        msg: "Insuffcient funds in wallet, mint price is 0.03 Ethereum. Please add some funds or contact @sandeepsuresh98 for help",
        type: "error"
      })
    } finally {
      setMintLoading(false)
    }
  }

  const login = async () => {
    provider.listAccounts().then(accounts => {
      setAddress(accounts[0])
      console.log("Connected Account",accounts[0])
      setIsConnected(true);
      magic.connect.getWalletInfo().then(walletInfo => {
        console.log("Setting wallet type: " + walletInfo.walletType)
        setWalletType(walletInfo.walletType)
      });
    });
  };

  const showWallet = () => {
    magic.connect.showWallet().catch((e) => {
      console.log("Error showing wallet", e);
    });
  }

  const disconnectWallet = async () => {
    await magic.connect.disconnect().catch((e) => {
      console.log(e)
    });  
    setIsConnected(false)
    setAddress(null)
  }
  
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <TsParticles />
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        open={!!alert.msg}
        onClose={() => setAlert({})}
      >
        <Alert severity={alert.type || "success"} sx={{ width: "100%" }}>
          {alert.msg}
        </Alert>
      </Snackbar>
      <div
        style={{
          height: "100vh",
          width: "100vw",
        }}
      >
        <ButtonAppBar></ButtonAppBar>
        <AppContainer>
          <AppTitle>Synthetic Dreams</AppTitle>
          <Paper elevation={2} sx={{ my: 2, overflow: "hidden" }}>
            {!isImageLoading && !imageUrl && (
              <div></div>
            )}
            
            {(isImageLoading || isMintLoading) && (
              <Box
                minHeight="30vh"
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
              <CircularProgress />
              </Box>
            )}

            {!isImageLoading && imageUrl && !isMintLoading && (
              <Box
                minHeight="30vh"
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <img
                  width="100%"
                  src={imageUrl}
                  alt={"stable diffusion image."}
                />              
              </Box>
            )}

          </Paper>
          <Box
            as="form"
            onSubmit={handleSubmit}
            display="flex"
            flexDirection="column"
            sx={{
              background: "#000",
            }}
          >
            <TextField
              name="prompt"
              size="small"
              placeholder="Create a dream"
            />
            <Box mb={2} />
            <Button type="submit" variant="contained">
              Dream
            </Button>
            <Box mb={2} />
            {imageUrl && (
              <>
                <Button onClick={handleMint} variant="contained">
                  Mint
                </Button>
                <Box mb={2} />
              </>
            )}
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              sx={{
                "& div": {
                  width: "100%",
                },
                "& button": {
                  width: "100%",
                  textAlign: "center !important",
                },
              }}
            >
              {!isConnected && (
                <Button onClick={login} variant="outlined">
                  Connect
                </Button> 
              )}

              {isConnected && (
                <div>
                  {walletType == "magic" && (
                    <Button onClick={showWallet} variant="outlined">
                      Show Wallet
                    </Button>
                  )}


                  {walletType != "magic" && (
                    <Button onClick={disconnectWallet}>
                      Disconnect
                    </Button>
                  )}

                  
                </div>
              )}
              
            </Box>
          </Box>
        </AppContainer>
      </div>
    </ThemeProvider>
  );
}

const AppTitle = ({ children }) => (
  <Typography
    textTransform="uppercase"
    variant="h3"
    sx={{
      letterSpacing: ["2px", "8px"],
      textShadow: "-3px -3px 0px #fff4, 4px 4px 0px #7d12ff",
    }}
  >
    {children}
  </Typography>
);

const AppContainer = ({ children }) => (
  <Box
    padding={[2, 6]}
    justifyContent="center"
    alignItems="center"
    textAlign="center"
    // sx={{
    //   display: ["block", "flex"],
    //   flexDirection: ["column"],
    // }}
    // height="100%"
    maxWidth="600px"
    mx="auto"
  >
    {children}
  </Box>
);

const TsParticles = () => {
  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        zIndex: "-1",
      }}
    >
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          background: {
            color: {
              value: "#000",
            },
          },
          fpsLimit: 120,
          interactivity: {
            detect_on: "window",
            events: {
              onHover: {
                enable: true,
                mode: "repulse",
              },
              resize: true,
            },
            modes: {
              push: {
                quantity: 4,
              },
              repulse: {
                distance: 200,
                duration: 0.4,
              },
            },
          },
          particles: {
            color: {
              value: "#7d12ff",
            },
            links: {
              color: "#7d12ff",
              distance: 150,
              enable: true,
              opacity: 0.5,
              width: 1,
            },
            move: {
              directions: "none",
              enable: true,
              outModes: {
                default: "bounce",
              },
              random: false,
              speed: 3,
              straight: false,
            },
            number: {
              density: {
                enable: true,
                area: 800,
              },
              value: 80,
            },
            opacity: {
              value: 0.5,
            },
            shape: {
              type: "circle",
            },
            size: {
              value: { min: 1, max: 5 },
            },
          },
          detectRetina: true,
        }}
      />
    </div>
  );
};
