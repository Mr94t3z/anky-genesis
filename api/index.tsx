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


app.frame('/', (c) => {
  return c.res({
    image: '/ankydegengif.gif',
    intents: [
      <Button action="/pick-random-number">mint</Button>,
    ]
  })
})

app.frame('/pick-random-number', (c) => {
  return c.res({
    image: '/dynamic_changing_numbers.gif',
    intents: [
      <TextInput placeholder="how many do you want? (max is 8)" />,
      <Button action="/mint-page">submit</Button>,
    ]
  })
})

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
    const responseUserData = await fetch(`${baseUrlNeynarV2}/user/bulk?fids=${fid}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY || '',
      },
    });

    const userFarcasterData = await responseUserData.json();
    const userData = userFarcasterData.users[0];

    // const username = userData.username;

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

    if (totalTokenCount >= 1) {
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
                uh oh, you've already minted these NFTs.
              </Text>
            </VStack>
          </Box>
        ),
      });
    }

    return c.res({
      action: '/finish',
      image: '/numberofmints.gif',
      // image: (
      //   <Box
      //     grow
      //     alignVertical="center"
      //     backgroundColor="anky"
      //     padding="32"
      //     height="100%"
      //     border="1em solid rgb(32,97,129)"
      //   >
      //     <VStack gap="4">
      //       <Heading color="yellow" align="center" size="48">
      //         Anky Genesis
      //       </Heading>
      //       <Spacer size="16" />
      //       <Text align="center" color="white" size="18">
      //         Congrats @{username}! You can mint {maxMint} NFTs.
      //       </Text>
      //     </VStack>
      //   </Box>
      // ),
      intents: [
        <Button.Transaction target={`/mint/${fid}/${maxMint}`}>mint {total} ankys 👽</Button.Transaction>,
      ]
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
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
              Error
            </Heading>
            <Spacer size="16" />
            <Text align="center" color="white" size="18">
              Uh oh, something went wrong. Try again.
            </Text>
          </VStack>
        </Box>
      ),
      intents: [
        <Button action="/">Try again 🛸</Button>,
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
      chainId: 'eip155:84532',
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
    // image: (
    //   <Box
    //     grow
    //     alignVertical="center"
    //     backgroundColor="anky"
    //     padding="32"
    //     height="100%"
    //     border="1em solid rgb(32,97,129)"
    //   >
    //     <VStack gap="4">
    //       <Heading color="yellow" align="center" size="48">
    //         Transaction ID
    //       </Heading>
    //       <Spacer size="16" />
    //       <Text align="center" color="white" size="14">
    //         {transactionId}
    //       </Text>
    //     </VStack>
    //   </Box>
    // ),
    intents: [
      // <Button.Link href={`https://explorer.degen.tips/tx/${transactionId}`}>view on exploler</Button.Link>,
      <Button.Link href={`https://sepolia.basescan.org/tx/${transactionId}`}>view on exploler</Button.Link>,
      <Button action='/'>home 🛸</Button>,
    ]
  })
})

// Uncomment this line code to tested on local server
// devtools(app, { serveStatic });

export const GET = handle(app)
export const POST = handle(app)
