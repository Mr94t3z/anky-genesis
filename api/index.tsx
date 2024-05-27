import { Button, Frog, TextInput } from 'frog'
import { handle } from 'frog/vercel'
import { Box, Heading, Text, VStack, Spacer, vars } from "../lib/ui.js";
import { abi } from "../lib/ankyDegenGenesisAbi.js";
import dotenv from 'dotenv';

// Uncomment this packages to tested on local server
// import { devtools } from 'frog/dev';
// import { serveStatic } from 'frog/serve-static';

// Load environment variables from .env file
dotenv.config();

export const app = new Frog({
  assetsPath: '/',
  basePath: '/api/frame',
  ui: { vars },
  browserLocation: 'https://anky.degen'
  // Supply a Hub to enable frame verification.
  // hub: neynar({ apiKey: 'NEYNAR_FROG_FM' })
})

const baseUrlNeynarV2 = process.env.BASE_URL_NEYNAR_V2;
const baseUrlReservoir = process.env.BASE_URL_RESEVOIR;
const contractAddress = process.env.ANKY_DEGEN_PIXELS_NFT_CONTRACT_ADDRESS;
const CAST_INTENS = 
  "https://warpcast.com/~/compose?text=&embeds[]=https://anky-genesis.vercel.app/api/frame"


app.frame('/', (c) => {
  return c.res({
    image: '/degenmodeon.gif',
    intents: [
      <Button action="/pick-random-number">mint</Button>,
    ]
  })
})

app.frame('/pick-random-number', async (c) => {
  const { frameData } = c;
  const { fid } = frameData as unknown as { buttonIndex?: number; fid?: string };

  // Function to fetch user data and check if the user has already minted
  const hasUserAlreadyMinted = async (fid: string | undefined) => {
    try {
      const responseUserData = await fetch(`${baseUrlNeynarV2}/user/bulk?fids=${fid}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'api_key': process.env.NEYNAR_API_KEY || '',
        },
      });

      const userFarcasterData = await responseUserData.json();
      const userData = userFarcasterData.users[0];

      // User connected wallet addresses
      const ethAddresses = userData.verified_addresses.eth_addresses.map((address: string) => address.toLowerCase());

      // Array to store token counts for each address
      const tokenCounts = [];

      for (const ethAddress of ethAddresses) {
        try {
          // Get user tokens for the current Ethereum address
          const responseUserToken = await fetch(`${baseUrlReservoir}/users/${ethAddress}/tokens/v10?contract=${contractAddress}`, {
            headers: {
              'accept': 'application/json',
              'x-api-key': process.env.RESERVOIR_API_KEY || '',
            },
          });

          const userTokenData = await responseUserToken.json();

          if (userTokenData && userTokenData.tokens && userTokenData.tokens.length > 0) {
            const tokenCount = userTokenData.tokens[0].ownership.tokenCount;
            tokenCounts.push(tokenCount);
            console.log(`Token Count for ${ethAddress}:`, tokenCount);
          } else {
            console.log(`No tokens found for ${ethAddress}.`);
            tokenCounts.push(0);
          }
        } catch (error) {
          console.error(`Error fetching tokens for ${ethAddress}:`, error);
          tokenCounts.push(0);
        }
      }

      // Calculate total token count
      const totalTokenCount = tokenCounts.reduce((acc, count) => acc + parseInt(count), 0);

      return totalTokenCount >= 1;
    } catch (error) {
      console.error("Error fetching user data:", error);
      throw error;
    }
  };

  try {
    const alreadyMinted = await hasUserAlreadyMinted(fid);

    if (alreadyMinted) {
      return c.res({
        image: '/alreadyminted.gif',
        intents: [
          <Button.Link href={CAST_INTENS}>share on warpcast</Button.Link>,
        ]
      });
    }

    return c.res({
      image: '/dynamic_changing_numbers.gif',
      intents: [
        <TextInput placeholder="how many do you want? (max is 8)" />,
        <Button action="/mint-page">submit</Button>,
      ]
    });
  } catch (error) {
    console.error("Error checking mint status:", error);
    return c.res({
      image: (
        <Box
          grow
          alignVertical="center"
          backgroundColor="anky"
          padding="48"
          textAlign="center"
          height="100%"
        >
          <VStack gap="4">
            <Heading color="red" weight="900" align="center" size="32">
              error
            </Heading>
            <Spacer size="16" />
            <Text align="center" color="white" size="18">
              uh oh, something went wrong. try again.
            </Text>
          </VStack>
        </Box>
      ),
      intents: [
        <Button action="/">try again 🛸</Button>,
      ]
    });
  }
});

app.frame('/mint-page', async (c) => {
  const { inputText, frameData } = c;
  const { fid } = frameData as unknown as { buttonIndex?: number; fid?: string };

  const userNumber = inputText ? parseInt(inputText, 10) : 0;

  // Validate the input number
  if (isNaN(userNumber) || userNumber < 1 || userNumber > 8) {
    return c.res({
      image: (
        <Box
          grow
          alignVertical="center"
          backgroundColor="anky"
          padding="48"
          textAlign="center"
          height="100%"
        >
          <VStack gap="4">
            <Heading color="red" weight="900" align="center" size="32">
              failed
            </Heading>
            <Spacer size="16" />
            <Text align="center" color="white" size="18">
              you must pick a number from 1 to 8.
            </Text>
          </VStack>
        </Box>
      ),
      intents: [
        <Button action="/pick-random-number">try again 🛸</Button>,
      ]
    });
  }

  // Generate a random number between 1 and 8
  const maxMint = Math.floor(Math.random() * 8) + 1;

  const total = maxMint.toString();

  try {
    return c.res({
      action: '/finish',
      image: '/numberofmints.gif',
      intents: [
        <Button.Transaction target={`/mint/${fid}/${maxMint}`}>mint {total} pixelated ankys 👽</Button.Transaction>,
      ]
    });
  } catch (error) {
    console.error("Error processing mint:", error);
    return c.res({
      image: (
        <Box
          grow
          alignVertical="center"
          backgroundColor="anky"
          padding="48"
          textAlign="center"
          height="100%"
        >
          <VStack gap="4">
            <Heading color="red" weight="900" align="center" size="32">
              error
            </Heading>
            <Spacer size="16" />
            <Text align="center" color="white" size="18">
              uh oh, something went wrong. try again.
            </Text>
          </VStack>
        </Box>
      ),
      intents: [
        <Button action="/">try again 🛸</Button>,
      ]
    });
  }
});

 
app.transaction('/mint/:fid/:maxMint', async (c, next) => {
  await next();
  const txParams = await c.res.json();
  txParams.attribution = false;
  console.log(txParams);
  c.res = new Response(JSON.stringify(txParams), {
    headers: {
      "Content-Type": "application/json",
    },
  });
},
async (c) => {
  const { fid, maxMint } = c.req.param();
  try {
    // Contract transaction response.
    return c.contract({
      abi,
      chainId: 'eip155:666666666',
      functionName: 'mint',
      args: [
        BigInt(fid),
        BigInt(maxMint)],
      to: contractAddress as `0x${string}`,
    })
  } catch (error) {
    console.error("Transaction failure:", error);
    return new Response('dang', { status: 400 })
  }
})


app.frame('/finish', (c) => {
  const { transactionId } = c
  return c.res({
    image: '/success.gif',
    intents: [
      <Button.Link href={`https://explorer.degen.tips/tx/${transactionId}`}>view on degenscan</Button.Link>,
      <Button.Link href='https://anky.bot/'>write as anky 🛸</Button.Link>,
    ]
  })
})

// Uncomment this line code to tested on local server
// devtools(app, { serveStatic });

export const GET = handle(app)
export const POST = handle(app)
