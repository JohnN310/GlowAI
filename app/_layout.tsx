import { Stack } from "expo-router";
import { ThemeProvider } from "./theme/ThemeContext";

export default function RootLayout() {
  return (

  <ThemeProvider>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccountSetup"  options={{headerBackButtonDisplayMode: "minimal"}} />
    </Stack>
  </ThemeProvider>
  );
}
