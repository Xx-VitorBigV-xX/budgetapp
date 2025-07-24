import { View, Text, Button } from "react-native";
import { router } from "expo-router";

export default function TelaPrincipal() {
  return (
    <View>
      <Text>Página Inicial</Text>
      <Button title="Orçamento" onPress={() => router.push("/Orcamento")} />
      <Button title="Novo Orçamento" onPress={() => router.push("/NovoOrcamento")} />

    </View>
  );
}

TelaPrincipal.options ={
  title:"Orçamento"
};