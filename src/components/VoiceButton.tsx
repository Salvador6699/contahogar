import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { appToast as toast } from '@/lib/swal';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

import { Account } from '@/types/finance';

interface VoiceResult {
  type: 'income' | 'expense' | 'transfer';
  accountId: string;
  toAccountId?: string;
  amount: number;
  description: string;
}

interface VoiceButtonProps {
  accounts: Account[];
  onResult: (result: VoiceResult) => void;
}

// Typing for SpeechRecognition since it's not universally supported in TS DOM types yet
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function VoiceButton({ accounts = [], onResult }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Volver al modo de una frase
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      processVoiceCommand(speechToText);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'not-allowed') {
        toast.error('Permiso de micrófono denegado');
      } else if (event.error !== 'aborted') {
        toast.error('Error al escuchar. Evita hacer pausas largas.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const processVoiceCommand = (text: string) => {
    let amount = 0;
    let description = "";
    let type: 'income' | 'expense' | 'transfer' | null = null;
    let accountId = "";
    let toAccountId = "";

    let normalizedText = text.toLowerCase();

    // 1. Detectar Tipo (Ingreso, Gasto o Transferencia)
    if (normalizedText.match(/\b(transferencia|transferencias|traspaso|traspasos|pasar|paso)\b/)) {
      type = 'transfer';
      description = "Transferencia";
    } else if (normalizedText.match(/\b(gasto|gastos|gastado|pago|pagos|pagado|comprado|compra|compras)\b/)) {
      type = 'expense';
    } else if (normalizedText.match(/\b(ingreso|ingresado|cobro|cobrado)\b/)) {
      type = 'income';
    }

    // 2. Detectar Cuenta(s) (ignorando espacios para arreglar "La Caixa" vs "lacaixa")
    const textNoSpaces = normalizedText.replace(/\s+/g, "");

    if (type === 'transfer') {
      let foundAccounts = accounts.filter(acc => {
        const nameNoSpaces = acc.name.toLowerCase().replace(/\s+/g, "");
        return textNoSpaces.includes(nameNoSpaces);
      });

      for (const acc of foundAccounts) {
        const nameNoSpaces = acc.name.toLowerCase().replace(/\s+/g, "");
        if (new RegExp(`(de|desde)${nameNoSpaces}`).test(textNoSpaces)) {
          accountId = acc.id;
        }
        if (new RegExp(`(a|hacia)${nameNoSpaces}`).test(textNoSpaces)) {
          toAccountId = acc.id;
        }
      }
      
      // Fallback por orden de aparición
      if (!accountId || !toAccountId) {
        foundAccounts.sort((a, b) => {
          const nameA = a.name.toLowerCase().replace(/\s+/g, "");
          const nameB = b.name.toLowerCase().replace(/\s+/g, "");
          return textNoSpaces.indexOf(nameA) - textNoSpaces.indexOf(nameB);
        });
        
        if (foundAccounts.length >= 2) {
          accountId = accountId || foundAccounts[0].id;
          toAccountId = toAccountId || foundAccounts[1].id;
          if (accountId === toAccountId) {
            toAccountId = foundAccounts.find(a => a.id !== accountId)?.id || "";
          }
        }
      }
      
      // Limpiar texto
      accounts.forEach(acc => {
        const nameNoSpaces = acc.name.toLowerCase().replace(/\s+/g, "");
        const withSpaces = new RegExp(`\\b${acc.name.toLowerCase()}\\b`, 'g');
        const withoutSpaces = new RegExp(`\\b${nameNoSpaces}\\b`, 'g');
        normalizedText = normalizedText.replace(withSpaces, '').replace(withoutSpaces, '');
      });
    } else {
      for (const acc of accounts) {
        const nameNoSpaces = acc.name.toLowerCase().replace(/\s+/g, "");
        if (textNoSpaces.includes(nameNoSpaces)) {
          accountId = acc.id;
          const withSpaces = new RegExp(`\\b${acc.name.toLowerCase()}\\b`, 'g');
          const withoutSpaces = new RegExp(`\\b${nameNoSpaces}\\b`, 'g');
          normalizedText = normalizedText.replace(withSpaces, '').replace(withoutSpaces, '');
          break;
        }
      }
    }

    // Diccionario de números comunes por si la API devuelve texto
    const numberWords: Record<string, string> = {
      un: '1', uno: '1', una: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5',
      seis: '6', siete: '7', ocho: '8', nueve: '9', diez: '10', once: '11',
      doce: '12', trece: '13', catorce: '14', quince: '15', veinte: '20',
      treinta: '30', cuarenta: '40', cincuenta: '50', sesenta: '60',
      setenta: '70', ochenta: '80', noventa: '90', cien: '100',
      doscientos: '200', trescientos: '300', quinientos: '500', mil: '1000'
    };
    
    // Convertir palabras a dígitos
    Object.entries(numberWords).forEach(([word, digit]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      normalizedText = normalizedText.replace(regex, digit);
    });

    // 1. Quitar monedas y céntimos para que los números queden juntos (ej: "20 euros con 50" -> "20 con 50")
    normalizedText = normalizedText.replace(/\b(euros?|€|dólares|céntimos?|centimos?)\b/gi, "");

    // 2. Juntar números separados por "con", "coma" o "y" (ej: "20 con 50" -> "20.50")
    normalizedText = normalizedText.replace(/(\d+)\s*(?:con|coma|y)\s*(\d+)/gi, "$1.$2");
    
    // 3. Normalizar comas matemáticas a puntos
    normalizedText = normalizedText.replace(/,/g, ".");

    // 3. Detectar Importe
    const amountMatch = normalizedText.match(/(\d+(?:\.\d+)?)/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1]);
    }

    // 4. Extraer Categoría / Descripción (Lo que queda tras quitar tipo, moneda e importe)
    description = normalizedText
      .replace(/\b(gasto|gastado|pago|pagado|comprado|compra|ingreso|ingresado|cobro|cobrado)\b/gi, "")
      .replace(/euros?|€|dólares|pavos|en|para|de|por|con|el|la|los|las|un|una/gi, " ")
      .replace(amountMatch ? amountMatch[0] : "", "")
      .replace(/\s+/g, " ") // clean extra spaces
      .trim();

    if (description) {
      description = description.charAt(0).toUpperCase() + description.slice(1);
    }

    // Validación estricta
    if (type === 'transfer') {
      if (!accountId || !toAccountId || accountId === toAccountId || amount <= 0) {
        toast.error("Formato inválido. Di: Transferencia de [Cuenta Origen] a [Cuenta Destino] de [Cantidad]");
        return;
      }
      toast.success(`Transferencia de ${amount}€ desde ${accounts.find(a => a.id === accountId)?.name} a ${accounts.find(a => a.id === toAccountId)?.name}`);
    } else {
      if (!type || !accountId || amount <= 0 || !description) {
        toast.error(
          "Formato inválido. Debes decir: [Ingreso/Gasto], [Nombre de Cuenta], [Cantidad] y [Categoría/Concepto]."
        );
        return;
      }
      toast.success(`Entendido: ${type === 'income' ? 'Ingreso' : 'Gasto'} de ${amount}€ en ${accounts.find(a => a.id === accountId)?.name} para ${description}`);
    }

    onResult({ type, accountId, toAccountId, amount, description });
  };

  const toggleListening = () => {
    if (!isSupported) {
      toast.error('Tu navegador no soporta reconocimiento de voz');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  if (!isSupported) return null;

  return (
    <div className="fixed bottom-24 right-4 sm:right-8 sm:bottom-8 z-50">
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-12 right-0 bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg flex items-center gap-2"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Escuchando...
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={toggleListening}
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300",
          isListening 
            ? "bg-red-500 hover:bg-red-600 animate-pulse text-white shadow-red-500/50" 
            : "bg-primary hover:bg-primary/90 text-primary-foreground"
        )}
        aria-label="Añadir por voz"
      >
        {isListening ? (
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </Button>
    </div>
  );
}
