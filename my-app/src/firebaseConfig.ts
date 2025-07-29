import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
// Se for usar Analytics, descomente e importe:
// import { getAnalytics, Analytics } from 'firebase/analytics';

// Suas credenciais do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD6S_aL7bprSVqbksEWj_E3Ta3yFAdV93w",
  authDomain: "projetorobson-21c13.firebaseapp.com",
  projectId: "projetorobson-21c13",
  storageBucket: "projetorobson-21c13.firebasestorage.app",
  messagingSenderId: "779408684114",
  appId: "1:779408684114:web:ce4354ee3e927a58efdb8b",
  measurementId: "G-PJD8MTPREH"
};

let app: FirebaseApp;
// Verifica se um app já foi inicializado para evitar múltiplos inicializações (muito comum em hot-reloading)
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // Se já inicializado, pega a instância existente
}

// Inicializa os serviços do Firebase que você usará
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Se for usar Analytics:
// export const analytics: Analytics = getAnalytics(app);

// Opcional: exportar o próprio app se precisar dele em outro lugar
export { app };