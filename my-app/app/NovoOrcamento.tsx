import React, { useRef, useState, useEffect } from "react";
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  View,
  Text,
  TextInput,
  StyleSheet,
  Button,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  Switch,
} from "react-native";

import { RichEditor, RichToolbar, actions } from "react-native-pell-rich-editor";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

// Importações do Firebase
import { db, storage } from '../src/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Importações para PDF
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset'; // <-- NOVO: Importe Asset

// Importe sua logo aqui! Certifique-se de que o caminho está correto.
// Substitua 'logo_app.png' pelo nome do seu arquivo de logo
import appLogo from '../assets/logo_app.png'; // <--- EX: Assuma que sua logo está em assets/logo_app.png

type Imagem = {
  uri: string;
  name?: string;
  type?: string;
};

type ItemPrice = {
  id: string;
  name: string;
  unit: string;
  quantity: string;
  price: string;
};

export default function NovoOrcamento() {
  const [Nome, setNome] = useState("");
  const [Celular, setCelular] = useState("");
  const [Email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [Endereco, setEndereco] = useState("");
  const [Titulo, setTitulo] = useState("");

  const [relatorioHtml, setRelatorioHtml] = useState("");
  const [atividadesHtml, setAtividadesHtml] = useState("");
  const [imagens, setImagens] = useState<Imagem[]>([]);

  const [hidePrices, setHidePrices] = useState(false);
  const [items, setItems] = useState<ItemPrice[]>([
    { id: "1", name: "", unit: "Un", quantity: "1", price: "0,00" },
  ]);

  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [discountValue, setDiscountValue] = useState("0,00");

  const [showQuantityType, setShowQuantityType] = useState(true);
  const [showUnitPrice, setShowUnitPrice] = useState(true);
  const [showSubtotal, setShowSubtotal] = useState(true);
  const [showTotal, setShowTotal] = useState(true);

  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [logoBase64, setLogoBase64] = useState<string | null>(null); // Estado para a logo em Base64

  const richRelatorio = useRef<RichEditor>(null);
  const richAtividades = useRef<RichEditor>(null);

  const paymentMethodOptions = [
    { label: "pix", icon: "pix" },
    { label: "crédito", icon: "card" },
    { label: "débito", icon: "card" },
    { label: "dinheiro", icon: "money" },
    { label: "transferência", icon: "transfer" },
    { label: "boleto", icon: "barcode" },
    { label: "cheque", icon: "cheque" },
  ];

  // MODIFICADO: Efeito para carregar e converter a logo para Base64 ao iniciar
  useEffect(() => {
    const loadLogo = async () => {
      try {
        // Carrega o asset e garante que ele esteja disponível localmente
        const asset = Asset.fromModule(appLogo);
        await asset.downloadAsync(); // Garante que o asset esteja baixado para um URI de arquivo

        // Agora use a URI local do asset para ler o arquivo
        // Use asset.localUri para assets baixados, ou asset.uri como fallback
        const base64 = await FileSystem.readAsStringAsync(asset.localUri || asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Assumindo que a logo é um PNG, ajuste o tipo MIME se for JPG, etc.
        setLogoBase64(`data:image/png;base64,${base64}`);
      } catch (error) {
        console.error("Erro ao carregar ou converter logo para Base64:", error);
        // Opcional: mostrar um alerta ao usuário se a logo não puder ser carregada
        Alert.alert("Erro", "Não foi possível carregar a logo para o PDF.");
      }
    };

    loadLogo();
  }, []); // Executa apenas uma vez ao montar o componente


  const selecionarImagens = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Habilite o acesso à galeria nas configurações.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const novasImagens: Imagem[] = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || 'imagem.jpg',
        type: asset.type || 'image/jpeg',
      }));
      setImagens((prev) => [...prev, ...novasImagens]);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { id: String(items.length + 1 + Math.random()), name: "", unit: "Un", quantity: "1", price: "0,00" }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof ItemPrice, value: string) => {
    setItems(items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const formatCurrency = (value: string) => {
    let cleanedValue = value.replace(/[^0-9,]/g, '');
    if (cleanedValue.includes(',')) {
      const parts = cleanedValue.split(',');
      if (parts[1].length > 2) {
        parts[1] = parts[1].substring(0, 2);
      }
      cleanedValue = parts[0] + ',' + parts[1];
    } else if (cleanedValue.length > 0 && !isNaN(Number(cleanedValue.replace(',', '.')))) {
      if (cleanedValue.length > 1 && cleanedValue.startsWith('0') && cleanedValue.length > 1 && !cleanedValue.includes(',')) {
        cleanedValue = parseInt(cleanedValue, 10).toString();
      }
      if (cleanedValue !== '' && cleanedValue !== '0' && !cleanedValue.includes(',')) {
        cleanedValue = cleanedValue + ',00';
      }
    }
    return cleanedValue;
  };

  const calculateSubtotal = () => {
    return items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity.replace(',', '.') || '0');
      const price = parseFloat(item.price.replace(',', '.') || '0');
      return total + (quantity * price);
    }, 0);
  };

  const calculateDiscountAmount = (subtotal: number) => {
    const discountVal = parseFloat(discountValue.replace(',', '.') || '0');
    if (discountType === "fixed") {
      return discountVal;
    } else { // percentage
      return subtotal * (discountVal / 100);
    }
  };

  const subtotal = calculateSubtotal();
  const discountAmount = calculateDiscountAmount(subtotal);
  const finalTotal = subtotal - discountAmount;

  const handlePaymentMethodToggle = (method: string) => {
    setSelectedPaymentMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const uploadImageToFirebase = async (imageUri: string, imageName: string) => {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const storageRef = ref(storage, `orcamentos_imagens/${imageName}_${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      Alert.alert("Erro", "Não foi possível enviar uma das imagens.");
      return null;
    }
  };

  const handleSalvar = async () => {
    if (!Titulo.trim() || !Nome.trim()) {
      Alert.alert("Erro", "Título e Nome do Cliente são campos obrigatórios.");
      return;
    }

    try {
      const uploadedImageUrls: string[] = [];
      for (const img of imagens) {
        if (img.uri && img.name) {
          const url = await uploadImageToFirebase(img.uri, img.name);
          if (url) {
            uploadedImageUrls.push(url);
          }
        }
      }

      const orcamentoData = {
        titulo: Titulo,
        cliente: {
          nome: Nome,
          celular: Celular,
          email: Email,
          cpfCnpj: cpfCnpj,
          endereco: Endereco,
        },
        relatorioInicial: relatorioHtml,
        descricaoAtividades: atividadesHtml,
        imagens: uploadedImageUrls,
        hidePrices: hidePrices,
        items: items.map(item => ({
          name: item.name,
          unit: item.unit,
          quantity: parseFloat(item.quantity.replace(',', '.') || '0'),
          price: parseFloat(item.price.replace(',', '.') || '0'),
        })),
        discountType: discountType,
        discountValue: parseFloat(discountValue.replace(',', '.') || '0'),
        subtotal: subtotal,
        discountAmount: discountAmount,
        finalTotal: finalTotal,
        showQuantityType: showQuantityType,
        showUnitPrice: showUnitPrice,
        showSubtotal: showSubtotal,
        showTotal: showTotal,
        selectedPaymentMethods: selectedPaymentMethods,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "orcamentos"), orcamentoData);
      console.log("Documento salvo com ID: ", docRef.id);
      Alert.alert("Sucesso!", "Orçamento salvo com sucesso no Firebase!");

      // Limpar o formulário
      setNome("");
      setCelular("");
      setEmail("");
      setCpfCnpj("");
      setEndereco("");
      setTitulo("");
      setRelatorioHtml("");
      setAtividadesHtml("");
      setImagens([]);
      setHidePrices(false);
      setItems([{ id: "1", name: "", unit: "Un", quantity: "1", price: "0,00" }]);
      setDiscountType("fixed");
      setDiscountValue("0,00");
      setShowQuantityType(true);
      setShowUnitPrice(true);
      setShowSubtotal(true);
      setShowTotal(true);
      setSelectedPaymentMethods([]);

    } catch (e) {
      console.error("Erro ao adicionar documento: ", e);
      Alert.alert("Erro", "Ocorreu um erro ao salvar o orçamento. Tente novamente.");
    }
  };

  // --------------------------------------------------------------------------
  // Função para gerar o HTML do orçamento
  const generateOrcamentoHtml = () => {
    const formattedDate = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Função auxiliar para converter HTML de RichEditor para exibir no PDF
    const cleanHtmlForPdf = (htmlContent: string) => {
        let cleaned = htmlContent.replace(/style="[^"]*"/g, '');
        cleaned = cleaned.replace(/<p>/g, '<p style="margin-bottom: 5px;">');
        cleaned = cleaned.replace(/<li>/g, '<li style="margin-bottom: 3px;">');
        return cleaned;
    };

    // Adicione a logo no HTML se ela estiver carregada
    const logoHtml = logoBase64 ? `
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${logoBase64}" style="width: 100px; height: 100px; object-fit: contain;" alt="Logo da Empresa" />
      </div>
    ` : '';

    let itemsHtml = '';
    if (!hidePrices) {
      itemsHtml = `
        <table style="width:100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background-color:#f2f2f2;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item</th>
              ${showQuantityType ? '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Qtd/Tipo</th>' : ''}
              ${showUnitPrice ? '<th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Val. Unit.</th>' : ''}
              ${showSubtotal ? '<th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Subtotal</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
                ${showQuantityType ? `<td style="border: 1px solid #ddd; padding: 8px;">${item.quantity} ${item.unit}</td>` : ''}
                ${showUnitPrice ? `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">R$ ${parseFloat(item.price.replace(',', '.')).toFixed(2).replace('.', ',')}</td>` : ''}
                ${showSubtotal ? `<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">R$ ${(parseFloat(item.quantity.replace(',', '.')) * parseFloat(item.price.replace(',', '.'))).toFixed(2).replace('.', ',')}</td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
        itemsHtml = `
            <table style="width:100%; border-collapse: collapse; margin-top: 15px;">
              <thead>
                <tr style="background-color:#f2f2f2;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity} ${item.unit}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
        `;
    }

    const totalSummaryHtml = showTotal && !hidePrices ? `
        <div style="text-align: right; margin-top: 20px; font-size: 1.1em; font-weight: bold;">
            <p>Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}</p>
            <p>Desconto: - R$ ${discountAmount.toFixed(2).replace('.', ',')}</p>
            <p style="border-top: 1px solid #ccc; padding-top: 5px;">Total Geral: R$ ${finalTotal.toFixed(2).replace('.', ',')}</p>
        </div>
    ` : '';

    const paymentMethodsHtml = selectedPaymentMethods.length > 0 ? `
        <h3 style="margin-top: 20px; color: #333;">Métodos de Pagamento Aceitos:</h3>
        <ul style="list-style-type: none; padding: 0;">
            ${selectedPaymentMethods.map(method => `
                <li style="margin-bottom: 5px; font-size: 0.95em;">${method.charAt(0).toUpperCase() + method.slice(1)}</li>
            `).join('')}
        </ul>
    ` : '';

    const imagesHtml = imagens.length > 0 ? `
      <h3 style="margin-top: 20px; color: #333;">Imagens Anexadas:</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        ${imagens.map(img => `<img src="${img.uri}" style="width: 150px; height: 150px; object-fit: cover; margin-right: 10px; margin-bottom: 10px; border-radius: 8px;" />`).join('')}
      </div>
    ` : '';


    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Orçamento: ${Titulo}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          h1 { color: #0056b3; text-align: center; margin-bottom: 20px; }
          h2 { color: #0056b3; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 25px; }
          h3 { color: #444; margin-top: 15px; }
          .section { margin-bottom: 20px; }
          .client-info p { margin: 2px 0; }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          .items-table th, .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .items-table th {
            background-color: #f2f2f2;
            text-align: left;
          }
          .items-table td:nth-child(4),
          .items-table th:nth-child(4),
          .items-table td:nth-child(3),
          .items-table th:nth-child(3) {
            text-align: right; /* Alinha valores numericos à direita */
          }
          .total-summary {
            text-align: right;
            margin-top: 20px;
            font-size: 1.1em;
            font-weight: bold;
          }
          .total-summary p { margin: 5px 0; }
          .total-summary p:last-child {
            border-top: 1px solid #ccc;
            padding-top: 5px;
            font-size: 1.2em;
            color: #28a745; /* Green for total */
          }
          .rich-text-content p, .rich-text-content li {
            margin-bottom: 5px;
          }
          .rich-text-content ul, .rich-text-content ol {
            margin-left: 20px;
          }
          .image-gallery {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .image-gallery img {
            width: 150px;
            height: 150px;
            object-fit: cover;
            margin-right: 10px;
            margin-bottom: 10px;
            border-radius: 8px;
          }
        </style>
      </head>
      <body>
        ${logoHtml} <h1>${Titulo}</h1>
        <p style="text-align: center; font-style: italic;">Data: ${formattedDate}</p>

        <div class="section client-info">
          <h2>Dados do Cliente</h2>
          <p><strong>Nome:</strong> ${Nome}</p>
          ${Celular ? `<p><strong>Celular:</strong> ${Celular}</p>` : ''}
          ${Email ? `<p><strong>Email:</strong> ${Email}</p>` : ''}
          ${cpfCnpj ? `<p><strong>CPF/CNPJ:</strong> ${cpfCnpj}</p>` : ''}
          ${Endereco ? `<p><strong>Endereço:</strong> ${Endereco}</p>` : ''}
        </div>

        <div class="section items-section">
          <h2>Itens do Orçamento</h2>
          ${itemsHtml}
          ${totalSummaryHtml}
        </div>

        ${paymentMethodsHtml}

        <div class="section rich-text-content">
          <h2>Relatório Inicial</h2>
          ${relatorioHtml ? cleanHtmlForPdf(relatorioHtml) : '<p><i>Nenhum relatório inicial fornecido.</i></p>'}
        </div>

        <div class="section rich-text-content">
          <h2>Descrição das Atividades</h2>
          ${atividadesHtml ? cleanHtmlForPdf(atividadesHtml) : '<p><i>Nenhuma descrição de atividades fornecida.</i></p>'}
        </div>

        <div class="section image-gallery">
            ${imagesHtml}
        </div>

      </body>
      </html>
    `;
    return htmlContent;
  };

  const createAndSharePdf = async () => {
    if (!Titulo.trim() || !Nome.trim()) {
      Alert.alert("Atenção", "Preencha o Título do Orçamento e o Nome do Cliente antes de gerar o PDF.");
      return;
    }
    // Adição de verificação para logo
    if (!logoBase64) {
      Alert.alert("Aguarde", "A logo ainda está sendo carregada. Por favor, tente novamente em alguns segundos.");
      return;
    }

    try {
      const html = generateOrcamentoHtml();
      const { uri } = await Print.printToFileAsync({ html });

      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
      Alert.alert("PDF Gerado", "O orçamento em PDF foi gerado e está pronto para ser compartilhado.");
    } catch (error) {
      console.error("Erro ao gerar ou compartilhar PDF:", error);
      Alert.alert("Erro", "Não foi possível gerar ou compartilhar o PDF. Verifique as permissões e tente novamente.");
    }
  };


  return (
    <View style={{ flex: 1 }}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        enableOnAndroid
        extraScrollHeight={250}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.h1}>Novo Orçamento</Text>
        <Text style={styles.horizontalLine}></Text>

        <TextInput
          style={styles.input}
          placeholder="Título do orçamento"
          value={Titulo}
          onChangeText={setTitulo}
        />

        <Text style={styles.h3}>Dados do Cliente</Text>
        

        <TextInput style={styles.input} placeholderTextColor="#888" placeholder="Nome" value={Nome} onChangeText={setNome} />
        <TextInput style={styles.input} placeholderTextColor="#888" placeholderTextColor="#888",placeholder="Celular" value={Celular} onChangeText={setCelular} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholderTextColor="#888" placeholder="Email" value={Email} onChangeText={setEmail} keyboardType="email-address" />
        <TextInput style={styles.input} placeholderTextColor="#888" placeholder="CPF/CNPJ" value={cpfCnpj} onChangeText={setCpfCnpj} keyboardType="numeric" />
        <TextInput style={styles.input} placeholderTextColor="#888" placeholder="Endereço" value={Endereco} onChangeText={setEndereco} />

        {/* Start of "Preços" Section */}
        <View style={styles.pricesHeader}>
          <Text style={styles.h3}>Preços</Text>
          <View style={styles.hideSwitchContainer}>
            <Switch
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={hidePrices ? "#f5dd4b" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={setHidePrices}
              value={hidePrices}
            />
            <Text style={styles.hideText}>ocultar</Text>
          </View>
        </View>

        {items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <TextInput
              style={styles.itemInput}
              placeholder="Nome do item"
              value={item.name}
              onChangeText={(text) => handleItemChange(item.id, "name", text)}
            />
            <View style={styles.itemDetailsRow}>
              <TextInput
                style={styles.unitInput}
                value={item.unit}
                onChangeText={(text) => handleItemChange(item.id, "unit", text)}
              />
              <TextInput
                style={styles.quantityInput}
                value={item.quantity}
                onChangeText={(text) => handleItemChange(item.id, "quantity", text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
              <TouchableOpacity onPress={() => handleRemoveItem(item.id)} style={styles.removeItemButton}>
                <Text style={styles.removeItemText}>X</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.currencySymbol}>R$</Text>
              <TextInput
                style={styles.priceInput}
                value={item.price}
                onChangeText={(text) => handleItemChange(item.id, "price", formatCurrency(text))}
                keyboardType="numeric"
              />
              <View style={styles.priceArrows}>
                <TouchableOpacity>
                  <Text style={styles.arrowIcon}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.arrowIcon}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.totalItemPrice}>R$ {(parseFloat(item.quantity.replace(',', '.') || '0') * parseFloat(item.price.replace(',', '.') || '0')).toFixed(2).replace('.', ',')}</Text>
          </View>
        ))}

        <TouchableOpacity onPress={handleAddItem} style={styles.addItemButton}>
          <Text style={styles.addItemButtonText}>+ Adicionar Item</Text>
        </TouchableOpacity>
        {/* End of "Preços" Section */}

        {/* Start of "Desconto" Section */}
        <View style={styles.discountHeader}>
          <Text style={styles.h3}>Desconto</Text>
          <TouchableOpacity style={styles.helpIcon}>
            <Text style={styles.helpIconText}>?</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.discountInputRow}>
          <TouchableOpacity
            style={styles.discountTypeButton}
            onPress={() => setDiscountType(discountType === "fixed" ? "percentage" : "fixed")}
          >
            <Text style={styles.discountTypeButtonText}>
              {discountType === "fixed" ? "R$" : "%"}
            </Text>
          </TouchableOpacity>
          <TextInput
            style={styles.discountValueInput}
            value={discountValue}
            onChangeText={(text) => setDiscountValue(formatCurrency(text))}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>R$ {subtotal.toFixed(2).replace('.', ',')}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Desconto</Text>
          <Text style={styles.summaryValue}>- R$ {discountAmount.toFixed(2).replace('.', ',')}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalSummaryRow]}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>R$ {finalTotal.toFixed(2).replace('.', ',')}</Text>
        </View>
        {/* End of "Desconto" Section */}

        {/* Start of "Apresentar preços" Section */}
        <Text style={styles.h3}>Apresentar preços</Text>
        <View style={styles.priceDisplayToggle}>
          <Switch
            trackColor={{ false: "#767577", true: "#5cb85c" }}
            thumbColor={showQuantityType ? "#f5f5f5" : "#f4f3f4"}
            onValueChange={setShowQuantityType}
            value={showQuantityType}
          />
          <Text style={styles.toggleLabel}>quantidade e tipo (item)</Text>
        </View>
        <View style={styles.priceDisplayToggle}>
          <Switch
            trackColor={{ false: "#767577", true: "#5cb85c" }}
            thumbColor={showUnitPrice ? "#f5f5f5" : "#f4f3f4"}
            onValueChange={setShowUnitPrice}
            value={showUnitPrice}
          />
          <Text style={styles.toggleLabel}>valor unitário (item)</Text>
        </View>
        <View style={styles.priceDisplayToggle}>
          <Switch
            trackColor={{ false: "#767577", true: "#5cb85c" }}
            thumbColor={showSubtotal ? "#f5f5f5" : "#f4f3f4"}
            onValueChange={setShowSubtotal}
            value={showSubtotal}
          />
          <Text style={styles.toggleLabel}>subtotal (item)</Text>
        </View>
        <View style={styles.priceDisplayToggle}>
          <Switch
            trackColor={{ false: "#767577", true: "#5cb85c" }}
            thumbColor={showTotal ? "#f5f5f5" : "#f4f3f4"}
            onValueChange={setShowTotal}
            value={showTotal}
          />
          <Text style={styles.toggleLabel}>valor total</Text>
        </View>
        {/* End of "Apresentar preços" Section */}

        {/* Start of "Métodos de pagamento" Section */}
        <Text style={styles.h3}>Métodos de pagamento</Text>
        {paymentMethodOptions.map((option) => (
          <TouchableOpacity
            key={option.label}
            style={styles.paymentMethodOption}
            onPress={() => handlePaymentMethodToggle(option.label)}
          >
            <View style={[
              styles.checkbox,
              selectedPaymentMethods.includes(option.label) && styles.checkboxChecked
            ]}>
              {selectedPaymentMethods.includes(option.label) && <Text style={styles.checkboxCheckmark}>✓</Text>}
            </View>
            <Text style={styles.paymentMethodIcon}>{option.icon === 'pix' ? '💠' : option.icon === 'card' ? '💳' : option.icon === 'money' ? '💰' : option.icon === 'transfer' ? '↔️' : option.icon === 'barcode' ? '📊' : option.icon === 'cheque' ? '✍️' : ''}</Text>
            <Text style={styles.paymentMethodLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
        {/* End of "Métodos de pagamento" Section */}


        <Text style={styles.h3}>Relatório Inicial</Text>
        <RichEditor
          ref={richRelatorio}
          placeholder="Digite o relatório inicial..."
          style={styles.richEditor}
          onChange={setRelatorioHtml}
        />
        <RichToolbar
          editor={richRelatorio}
          actions={[
            actions.setBold,
            actions.setItalic,
            actions.setUnderline,
            actions.insertBulletsList,
            actions.insertOrderedList,
          ]}
          style={styles.richToolbar}
        />

        <Text style={styles.h3}>Descrição das Atividades</Text>
        <RichEditor
          ref={richAtividades}
          placeholder="Digite a descrição das atividades..."
          style={styles.richEditor}
          onChange={setAtividadesHtml}
        />
        <RichToolbar
          editor={richAtividades}
          actions={[
            actions.setBold,
            actions.setItalic,
            actions.setUnderline,
            actions.insertBulletsList,
            actions.insertOrderedList,
          ]}
          style={styles.richToolbar}
        />

        <Text style={styles.h3}>Anexar Imagens</Text>
        <TouchableOpacity onPress={selecionarImagens} style={styles.uploadBox}>
          <Text>Toque aqui para escolher imagens</Text>
        </TouchableOpacity>

        <ScrollView horizontal style={{ marginTop: 10 }}>
          {imagens.map((img, idx) => (
            <Image
              key={idx}
              source={{ uri: img.uri }}
              style={styles.imagePreview}
            />
          ))}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <Button title="Salvar Orçamento" onPress={handleSalvar} />
          {/* NOVO BOTÃO PARA GERAR PDF */}
          <View style={{ marginTop: 10 }}>
            <Button title="Gerar PDF do Orçamento" onPress={createAndSharePdf} color="#007bff" />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    paddingBottom: 200, // Adiciona padding no final para ScrollView
  },
  h1: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
    textAlign: "center",
  },
  horizontalLine: {
    borderBottomColor: "#ccc",
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  h3: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 25,
    marginBottom: 10,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  richEditor: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
  },
  richToolbar: {
    backgroundColor: "#f2f2f2",
    borderColor: "#ccc",
    borderWidth: 1,
    borderTopWidth: 0,
    borderRadius: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginBottom: 20,
  },
  uploadBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    backgroundColor: "#f9f9f9",
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  buttonContainer: {
    marginTop: 30,
    marginBottom: 50,
  },
  // Styles for Prices Section
  pricesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 25,
    marginBottom: 10,
  },
  hideSwitchContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  hideText: {
    marginLeft: 5,
    fontSize: 16,
    color: "#555",
  },
  itemRow: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  itemInput: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 8,
    marginBottom: 8,
    fontSize: 16,
  },
  itemDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  unitInput: {
    flex: 0.2,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 8,
    marginRight: 10,
    textAlign: "center",
  },
  quantityInput: {
    flex: 0.3,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 8,
    textAlign: "center",
  },
  removeItemButton: {
    backgroundColor: "#ff4d4d",
    borderRadius: 20,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  removeItemText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 8,
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 5,
    color: "#555",
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
  },
  priceArrows: {
    marginLeft: 10,
  },
  arrowIcon: {
    fontSize: 18,
    color: "#555",
    paddingVertical: 2,
  },
  totalItemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "right",
    marginTop: 5,
    color: "#333",
  },
  addItemButton: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  addItemButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Styles for Discount Section
  discountHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 25,
    marginBottom: 10,
  },
  helpIcon: {
    backgroundColor: "#ccc",
    borderRadius: 15,
    width: 25,
    height: 25,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  helpIconText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  discountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  discountTypeButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  discountTypeButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  discountValueInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  summaryLabel: {
    fontSize: 16,
    color: "#555",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  totalSummaryRow: {
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingTop: 10,
    marginTop: 5,
  },
  // Styles for Presentar Preços
  priceDisplayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  toggleLabel: {
    marginLeft: 10,
    fontSize: 16,
    color: "#555",
  },
  // Styles for Payment Methods
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  checkboxCheckmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentMethodIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  paymentMethodLabel: {
    fontSize: 16,
    color: '#333',
  },
});