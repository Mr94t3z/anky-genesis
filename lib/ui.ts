import { createSystem } from "frog/ui";

export const { Box, Image, Heading, Text, VStack, Spacer, vars } = createSystem({
  colors: {
    white: "white",
    black: "black",
    fcPurple: "rgb(71,42,145)",
    red: "red",
    green: "green",
    anky: 'rgb(32,97,129)',
    yellow: 'rgb(247,169,72)',
    chocolate: 'rgb(67,33,47)'
  },
  fonts: {
    default: [
      {
        name: "Space Mono",
        source: "google",
      },
    ],
  },
});