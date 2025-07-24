import { View, Text, TextInput,StyleSheet, ScrollView } from "react-native";
import React,{useState} from "react";
import { router } from "expo-router";


export default function NovoOrcamento() {
  const[Nome,setNome] = useState('')
  const[Celular,setCelular]=useState('')
  const[Email,setEmail]=useState('')
  const[cpfCnpj,setCpfCnpj]=useState('')
  const[Endereco,setEndereco]=useState('')


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Novo Orçamento</Text>
      <Text style={styles.horizontalLine}></Text>
      <Text>Título do Orçamento</Text>
      <Text>Dados do Cliente</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome"
        value={Nome}
        onChangeText={setNome}>
      </TextInput>

      <TextInput
        style={styles.input}
        placeholder="Celular"
        value={Celular}
        onChangeText={setCelular}>
      </TextInput>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={Email}
        onChangeText={setEmail}>
      </TextInput>

      <TextInput
        style={styles.input}
        placeholder="CPF/CNPJ"
        value={cpfCnpj}
        onChangeText={setCpfCnpj}>
      </TextInput>

      <TextInput
        style={styles.input}
        placeholder="Endereço"
        value={Endereco}
        onChangeText={setEndereco}>
      </TextInput>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:{
    padding:20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  h3: {
    fontSize: 18,
    fontWeight: '400',
    color: '#777',
    marginBottom: 6,
  },
  horizontalLine:{
    height: 2,
    backgroundColor: '#000',
  }
  
})
