import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { appToast as toast } from '@/lib/swal';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceResult {
  amount: number;
  description: string;
}

interface VoiceButtonProps {
  onResult: (result: VoiceResult) => void;
}

// Typing for SpeechRecognition since it's not universally supported in TS DOM types yet
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function VoiceButton({ onResult }: VoiceButtonProps) {
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
    recognition.continuous = false;
    recognition.lang = 'es-ES'; // Spanish default
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
        toast.error('Error al escuchar. Inténtalo de nuevo.');
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

    // Normalize text: lowercase, replace "con" or "coma" with "."
    let normalizedText = text.toLowerCase();
    normalizedText = normalizedText.replace(/ con /g, ".");
    normalizedText = normalizedText.replace(/ coma /g, ".");
    normalizedText = normalizedText.replace(/,/g, ".");

    // Extract amount
    const amountMatch = normalizedText.match(/(\d+(?:\.\d+)?)/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1]);
    }

    // Extract description (heuristic: after prepositions)
    // Ej: "he gastado 15 en el supermercado" -> "supermercado"
    const descMatch = normalizedText.match(/(?:en|para|por|de|con)\s+(?:el\s+|la\s+|los\s+|las\s+|un\s+|una\s+)?(.+)/i);
    if (descMatch && descMatch[1]) {
      description = descMatch[1].trim();
    } else {
      // Fallback: use all text except the verbs, amount and currencies
      description = normalizedText
        .replace(/he gastado|gasté|compré|pagué|me cobraron|cobrado/gi, "")
        .replace(/euros?|€|dólares|pavos/gi, "")
        .replace(amountMatch ? amountMatch[0] : "", "")
        .trim();
    }

    // Capitalize first letter
    if (description) {
      description = description.charAt(0).toUpperCase() + description.slice(1);
    }

    if (amount === 0 && !description) {
        toast.error("No he entendido la cantidad ni el concepto. Prueba: 'He gastado 15 euros en comida'");
        return;
    }

    toast.success(`Entendido: ${amount > 0 ? amount + '€' : ''} ${description}`);
    onResult({ amount, description });
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
