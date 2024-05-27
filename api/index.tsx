import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { Box, Image, Heading, Text, VStack, Spacer, vars } from "../lib/ui.js";
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

let userMintLimits = {};

app.frame('/', (c) => {
  // Generate a random mint limit between 1 and 8
  const mintLimit = Math.floor(Math.random() * 8) + 1;
  // const userId = c.req.ip; // Example of using IP as a user identifier, adjust as necessary

  // // Store the mint limit for the user
  // userMintLimits[userId] = mintLimit;

  return c.res({
    image: '/ankydegengif.gif',
    intents: [
      <Button action="/mint-page">MINT</Button>,
    ]
  })
})


app.frame('/mint-page', async (c) => {
  const { frameData } = c;
  const { fid } = frameData as unknown as { buttonIndex?: number; fid?: string };

  let userMintLimits = 4;

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
              Congrats @{userData.username}! You can mint NFTs.
            </Text>
            <Spacer size="22" />
              <Box flexDirection="row" justifyContent="center">
                  <Text color="chocolate" align="center" size="14">By</Text>
                  <Spacer size="10" />
                  <Text color="yellow" decoration="underline" align="center" size="14"> @jpfraneto & @0x94t3z</Text>
              </Box>
          </VStack>
        </Box>
      ),
      intents: [
        <Button.Transaction target={`/mint/${fid}`}>Mint NFT</Button.Transaction>,
      ]
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return c.res({
      image: (
        <Box
          grow
          alignVertical="center"
          backgroundColor="red"
          padding="48"
          textAlign="center"
          height="100%"
        >
          <VStack gap="4">
            <Heading color="fcPurple" weight="900" align="center" size="32">
              Error
            </Heading>
            <Spacer size="16" />
            <Text align="center" size="16">
              Uh oh, something went wrong. Try again.
            </Text>
            <Spacer size="22" />
              <Box flexDirection="row" justifyContent="center">
                    <Text color="chocolate" align="center" size="14">By</Text>
                    <Spacer size="10" />
                    <Text color="yellow" decoration="underline" align="center" size="14"> @jpfraneto & @0x94t3z</Text>
              </Box>
          </VStack>
        </Box>
      ),
      intents: [
        <Button action="/">Try again</Button>,
      ]
    });
  }
});
 
app.transaction('/mint/:fid', async (c, next) => {
  await next();

  // const userId = c.req.ip; // Example of using IP as a user identifier, adjust as necessary
  // const mintLimit = userMintLimits[userId] || 0;
  // let userMints = c.state.userMints || 0;

  // // Check if the user can mint more NFTs
  // if (userMints >= mintLimit) {
  //   return c.res.json({ error: 'Mint limit reached' }, { status: 403 });
  // }

  // userMints += 1;
  // c.state.userMints = userMints;

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
  const { fid } = c.req.param();

  // Contract transaction response.
  return c.contract({
    abi,
    chainId: 'eip155:84532',
    functionName: 'mint',
    args: [
      BigInt(fid),
       8n],
    to: '0xfAE621C38b674f9b93D73Ccdd01cbC41Ef3bb663',
  })
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
          <Spacer size="22" />
            <Box flexDirection="row" justifyContent="center">
                <Text color="chocolate" align="center" size="14">By</Text>
                <Spacer size="10" />
                <Text color="yellow" decoration="underline" align="center" size="14"> @jpfraneto & @0x94t3z</Text>
            </Box>
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
