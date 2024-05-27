import { Button, Frog, TextInput } from 'frog'
import { handle } from 'frog/vercel'
import { Box, Heading, Text, VStack, Spacer, vars } from "../lib/ui.js";
import { abi } from "../lib/ankyDegenGenesisAbi.js";

// Uncomment this packages to tested on local server
// import { devtools } from 'frog/dev';
// import { serveStatic } from 'frog/serve-static';

export const app = new Frog({
  assetsPath: '/',
  basePath: '/api/frame',
  ui: { vars },
  // Supply a Hub to enable frame verification.
  // hub: neynar({ apiKey: 'NEYNAR_FROG_FM' })
})


app.frame('/', (c) => {
  return c.res({
    image: '/ankydegengif.gif',
    intents: [
      <Button action="/pick-random-number">MINT</Button>,
    ]
  })
})

app.frame('/pick-random-number', (c) => {
  return c.res({
    image: '/dynamic_changing_numbers.gif',
    intents: [
      <TextInput placeholder="Pick a number from 1 to 8." />,
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
              Failed
            </Heading>
            <Spacer size="16" />
            <Text align="center" color="white" size="18">
              You must pick a number from 1 to 8.
            </Text>
          </VStack>
        </Box>
      ),
      intents: [
        <Button action="/pick-random-number">Try again</Button>,
      ]
    });
  }

  // Generate a random number between 1 and 8
  const maxMint = Math.floor(Math.random() * 8) + 1;

  try {
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': 'NEYNAR_API_DOCS',
      },
    });

    const data = await response.json();
    const userData = data.users[0];

    return c.res({
      action: '/finish',
      image: (
        <Box
          grow
          alignVertical="center"
          backgroundColor="anky"
          padding="32"
          height="100%"
          border="1em solid rgb(32,97,129)"
        >
          <VStack gap="4">
            <Heading color="yellow" align="center" size="48">
              Anky Genesis
            </Heading>
            <Spacer size="16" />
            <Text align="center" color="white" size="18">
              Congrats @{userData.username}! You can mint {maxMint} NFTs.
            </Text>
          </VStack>
        </Box>
      ),
      intents: [
        <Button.Transaction target={`/mint/${fid}/${maxMint}`}>mint NFT 👽</Button.Transaction>,
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
        <Button action="/">Try again</Button>,
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
      to: '0xfAE621C38b674f9b93D73Ccdd01cbC41Ef3bb663',
    })
  } catch (error) {
    console.error("Transaction failure:", error);
    return new Response('dang', { status: 400 })
  }
})


app.frame('/finish', (c) => {
  const { transactionId } = c
  return c.res({
    image: (
      <Box
        grow
        alignVertical="center"
        backgroundColor="anky"
        padding="32"
        height="100%"
        border="1em solid rgb(32,97,129)"
      >
        <VStack gap="4">
          <Heading color="yellow" align="center" size="48">
            Transaction ID
          </Heading>
          <Spacer size="16" />
          <Text align="center" color="white" size="14">
            {transactionId}
          </Text>
        </VStack>
      </Box>
    ),
    intents: [
      // <Button.Link href={`https://explorer.degen.tips/tx/${transactionId}`}>View on Exploler</Button.Link>,
      <Button.Link href={`https://sepolia.basescan.org/tx/${transactionId}`}>View on Exploler</Button.Link>,
    ]
  })
})

// Uncomment this line code to tested on local server
// devtools(app, { serveStatic });

export const GET = handle(app)
export const POST = handle(app)
