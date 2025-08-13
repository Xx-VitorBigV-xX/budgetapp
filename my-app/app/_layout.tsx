// app/_layout.tsx (Mais simples e automático)
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#121212' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    /> // <--- Sem Stack.Screen explícitos, ele descobrirá todos os arquivos em `app/`.
  );
}