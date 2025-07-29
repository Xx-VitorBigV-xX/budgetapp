import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList, // Usaremos FlatList para melhor performance
  Image,
  TouchableOpacity,
  ActivityIndicator, // Para mostrar carregamento
  Alert,
} from "react-native";
import { router } from "expo-router";

// Importe 'db' do seu arquivo de configuração do Firebase
import { db } from '../src/firebaseConfig'; // Ajuste o caminho se necessário
import { collection, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore'; // Importe as funções necessárias

// Tipagem para o objeto de orçamento que será recuperado
type OrcamentoData = {
  id: string; // O ID do documento Firestore
  titulo: string;
  cliente: {
    nome: string;
    celular?: string;
    email?: string;
    cpfCnpj?: string;
    endereco?: string;
  };
  relatorioInicial?: string;
  descricaoAtividades?: string;
  imagens?: string[]; // As URLs das imagens agora
  hidePrices: boolean;
  items: Array<{
    name: string;
    unit: string;
    quantity: number; // Agora é number, não string
    price: number;   // Agora é number, não string
  }>;
  discountType: "fixed" | "percentage";
  discountValue: number; // Agora é number
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
  showQuantityType: boolean;
  showUnitPrice: boolean;
  showSubtotal: boolean;
  showTotal: boolean;
  selectedPaymentMethods: string[];
  createdAt: any; // Firebase Timestamp object
};

export default function Orcamento() {
  const [orcamentos, setOrcamentos] = useState<OrcamentoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Crie uma query para a coleção 'orcamentos'
    //    orderBy('createdAt', 'desc') ordena os orçamentos do mais novo para o mais antigo
    const q = query(collection(db, "orcamentos"), orderBy('createdAt', 'desc'));

    // 2. Use onSnapshot para ouvir as mudanças em tempo real (ou getDocs para uma única leitura)
    //    onSnapshot é preferível para manter a lista atualizada automaticamente
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const orcamentosList: OrcamentoData[] = [];
      querySnapshot.forEach((doc) => {
        // Obtenha os dados do documento
        const data = doc.data();

        // Converta os valores numéricos de volta se necessário (eles já devem estar como number no Firestore)
        // Se houver algum campo que salvou como string mas deveria ser number, converta aqui.
        // Ex: const quantity = typeof data.quantity === 'string' ? parseFloat(data.quantity.replace(',', '.')) : data.quantity;

        orcamentosList.push({
          id: doc.id, // O ID do documento é crucial para o FlatList key
          titulo: data.titulo,
          cliente: data.cliente,
          relatorioInicial: data.relatorioInicial,
          descricaoAtividades: data.descricaoAtividades,
          // As imagens já são um array de URLs
          imagens: data.imagens || [], // Garante que seja um array vazio se não houver imagens
          hidePrices: data.hidePrices,
          items: data.items.map((item: any) => ({
              name: item.name,
              unit: item.unit,
              quantity: parseFloat(item.quantity.toString().replace(',', '.') || '0'), // Garante number
              price: parseFloat(item.price.toString().replace(',', '.') || '0'),       // Garante number
          })),
          discountType: data.discountType,
          discountValue: parseFloat(data.discountValue.toString().replace(',', '.') || '0'),
          subtotal: parseFloat(data.subtotal.toString().replace(',', '.') || '0'),
          discountAmount: parseFloat(data.discountAmount.toString().replace(',', '.') || '0'),
          finalTotal: parseFloat(data.finalTotal.toString().replace(',', '.') || '0'),
          showQuantityType: data.showQuantityType,
          showUnitPrice: data.showUnitPrice,
          showSubtotal: data.showSubtotal,
          showTotal: data.showTotal,
          selectedPaymentMethods: data.selectedPaymentMethods || [],
          createdAt: data.createdAt,
        });
      });
      setOrcamentos(orcamentosList);
      setLoading(false); // Dados carregados
    }, (err) => {
      console.error("Erro ao carregar orçamentos:", err);
      setError("Não foi possível carregar os orçamentos. Verifique sua conexão e permissões.");
      setLoading(false);
      Alert.alert("Erro de Carregamento", "Ocorreu um erro ao buscar os orçamentos. Verifique sua conexão com a internet.");
    });

    // Função de limpeza do useEffect: parar de ouvir as mudanças quando o componente é desmontado
    return () => unsubscribe();
  }, []); // O array vazio garante que o useEffect rode apenas uma vez ao montar o componente

  // Componente Card para cada orçamento
  const renderOrcamentoCard = ({ item }: { item: OrcamentoData }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        // Aqui você pode navegar para uma tela de detalhes do orçamento
        // router.push({ pathname: "/detalhesOrcamento", params: { orcamentoId: item.id } });
        Alert.alert("Orçamento Clicado", `Você clicou no orçamento: ${item.titulo}`);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.titulo}</Text>
        {item.hidePrices && <Text style={styles.cardHidePricesTag}>PREÇOS OCULTOS</Text>}
      </View>
      <Text style={styles.cardClientName}>Cliente: {item.cliente.nome}</Text>
      {item.cliente.celular && (
        <Text style={styles.cardDetail}>Celular: {item.cliente.celular}</Text>
      )}
      {item.finalTotal > 0 && !item.hidePrices && item.showTotal && (
        <Text style={styles.cardTotal}>Total: R$ {item.finalTotal.toFixed(2).replace('.', ',')}</Text>
      )}

      {item.imagens && item.imagens.length > 0 && (
        <ScrollView horizontal style={styles.imageScroll}>
          {item.imagens.map((uri, index) => (
            <Image key={index} source={{ uri: uri }} style={styles.cardImage} />
          ))}
        </ScrollView>
      )}

      {/* Você pode adicionar mais detalhes aqui, como métodos de pagamento, etc. */}
      {item.selectedPaymentMethods && item.selectedPaymentMethods.length > 0 && (
        <Text style={styles.cardDetail}>Pagamento: {item.selectedPaymentMethods.join(', ')}</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Carregando orçamentos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => setLoading(true)}>
          <Text style={styles.retryButton}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (orcamentos.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>Nenhum orçamento encontrado. Comece criando um novo!</Text>
        {/* Opcional: Botão para ir para a tela de criação */}
        {/* <Button title="Criar Novo Orçamento" onPress={() => router.push("/novoOrcamento")} /> */}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Meus Orçamentos</Text>
      <FlatList
        data={orcamentos}
        renderItem={renderOrcamentoCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 200, // Ajuste para status bar
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flexShrink: 1, // Permite que o texto quebre linha se for longo
  },
  cardHidePricesTag: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  cardClientName: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  cardDetail: {
    fontSize: 14,
    color: '#777',
    marginBottom: 3,
  },
  cardTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745', // Verde para o total
    marginTop: 10,
    textAlign: 'right',
  },
  imageScroll: {
    marginTop: 10,
    marginBottom: 10,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    resizeMode: 'cover',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    color: '#007bff',
    fontSize: 16,
    marginTop: 10,
  }
});