# Memory

*This document contains high-priority active context that every new chat must read carefully.*

## Reverse Chronological Notes by Developer

### Friday 10/24

3:20pm Learned that Android emulator is flaky with ngrok aka `--tunnel` but this worked to get around it: close open Expo Go apps, re-open then open MessageAI 'manually' with the `exp://` URL.

### Tuesday 10/21

11:14pm All MVP work done, see POST_MVP.md

7:58pm Phase 2 and Phase 3 are completely done.

5:40pm Phase 0 and Phase 1 is completely done. Key learning: add `--clear` flag when running dev server, and expect it to take 30-60 seconds before the Expo Go app initializes.

2:12pm troubleshooting the Expo Go app saying `There was a problem running the requested app. Unknown error: The request timed out. exp://10.145.190.21:8081`, Claude's fix worked: use the `--tunnel` flag with `npx expo start`, which tunnels using ngrok to create a publicly accessible URL. After that, the QR code to open the app in Expo Go on my iPhone worked and I got the expected page for the default Expo project, created with `npx create-expo-app@` and I'm ready to start development. Note that I installed Watchman per [the React Native docs on getting started](https://reactnative.dev/docs/set-up-your-environment). I then tested that the app updates immediately on Expo Go by changing the text of `<ThemedText` in `app/(tabs)/index.tsx` to `Hello World!` ([as the Expo Docs suggest here](https://docs.expo.dev/get-started/start-developing/)) and seeing the Hello World message on my phone.
