// app/_layout.tsx

import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
    

      screenOptions={{
        headerStyle: {
          backgroundColor: '#121212',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    > <Stack.Screen
        name="Index"
        options={{
        title: "Orçamento",
        headerStyle: { backgroundColor: "#6200ee" },
        headerTintColor: "#fff",
    }}
  /></Stack>
    
  );
}
