import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Loader2, Check, Sparkles } from 'lucide-react';
import { appToast as toast } from '@/lib/swal';
import { cn, parseAmount } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Account } from '@/types/finance';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

export interface VoiceResult {
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

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ParsedVoiceDraft {
  type: 'income' | 'expense' | 'transfer' | null;
  accountId: string;
  toAccountId: string;
  amount: number;
  description: string;
}

const NUMBER_WORDS: Record<string, string> = {
  un: '1', uno: '1', una: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5',
  seis: '6', siete: '7', ocho: '8', nueve: '9', diez: '10', once: '11',
  doce: '12', trece: '13', catorce: '14', quince: '15', veinte: '20',
  treinta: '30', cuarenta: '40', cincuenta: '50', sesenta: '60',
  setenta: '70', ochenta: '80', noventa: '90', cien: '100',
  doscientos: '200', trescientos: '300', quinientos: '500', mil: '1000',
};

function parseVoiceCommandText(text: string, accounts: Account[]): ParsedVoiceDraft {
  let amount = 0;
  let description = '';
  let type: 'income' | 'expense' | 'transfer' | null = null;
  let accountId = '';
  let toAccountId = '';

  let normalizedText = text.toLowerCase();

  if (normalizedText.match(/\b(transferencia|transferencias|traspaso|traspasos|pasar|paso)\b/)) {
    type = 'transfer';
    description = 'Transferencia';
  } else if (normalizedText.match(/\b(gasto|gastos|gastado|pago|pagos|pagado|comprado|compra|compras)\b/)) {
    type = 'expense';
  } else if (normalizedText.match(/\b(ingreso|ingresado|cobro|cobrado)\b/)) {
    type = 'income';
  }

  const textNoSpaces = normalizedText.replace(/\s+/g, '');

  if (type === 'transfer') {
    const foundAccounts = accounts.filter((acc) => {
      const nameNoSpaces = acc.name.toLowerCase().replace(/\s+/g, '');
      return textNoSpaces.includes(nameNoSpaces);
    });

    for (const acc of foundAccounts) {
      const nameNoSpaces = acc.name.toLowerCase().replace(/\s+/g, '');
      if (new RegExp(`(de|desde)${nameNoSpaces}`).test(textNoSpaces)) {
        accountId = acc.id;
      }
      if (new RegExp(`(a|hacia)${nameNoSpaces}`).test(textNoSpaces)) {
        toAccountId = acc.id;
      }
    }

    if (!accountId || !toAccountId) {
      foundAccounts.sort((a, b) => {
        const nameA = a.name.toLowerCase().replace(/\s+/g, '');
        const nameB = b.name.toLowerCase().replace(/\s+/g, '');
        return textNoSpaces.indexOf(nameA) - textNoSpaces.indexOf(nameB);
      });

      if (foundAccounts.length >= 2) {
        accountId = accountId || foundAccounts[0].id;
        toAccountId = toAccountId || foundAccounts[1].id;
        if (accountId === toAccountId) {
          toAccountId = foundAccounts.find((a) => a.id !== accountId)?.id || '';
        }
      }
    }

    accounts.forEach((acc) => {
      const nameNoSpaces = acc.name.toLowerCase().replace(/\s+/g, '');
      const withSpaces = new RegExp(`\\b${acc.name.toLowerCase()}\\b`, 'g');
      const withoutSpaces = new RegExp(`\\b${nameNoSpaces}\\b`, 'g');
      normalizedText = normalizedText.replace(withSpaces, '').replace(withoutSpaces, '');
    });
  } else {
    for (const acc of accounts) {
      const nameNoSpaces = acc.name.toLowerCase().replace(/\s+/g, '');
      if (textNoSpaces.includes(nameNoSpaces)) {
        accountId = acc.id;
        const withSpaces = new RegExp(`\\b${acc.name.toLowerCase()}\\b`, 'g');
        const withoutSpaces = new RegExp(`\\b${nameNoSpaces}\\b`, 'g');
        normalizedText = normalizedText.replace(withSpaces, '').replace(withoutSpaces, '');
        break;
      }
    }
  }

  Object.entries(NUMBER_WORDS).forEach(([word, digit]) => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    normalizedText = normalizedText.replace(regex, digit);
  });

  normalizedText = normalizedText.replace(/\b(euros?|€|dólares|céntimos?|centimos?)\b/gi, '');
  normalizedText = normalizedText.replace(/(\d+)\s*(?:con|coma|y)\s*(\d+)/gi, '$1.$2');
  normalizedText = normalizedText.replace(/,/g, '.');

  const amountMatch = normalizedText.match(/(\d+(?:\.\d+)?)/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1]);
  }

  description = normalizedText
    .replace(/\b(gasto|gastado|pago|pagado|comprado|compra|ingreso|ingresado|cobro|cobrado)\b/gi, '')
    .replace(/euros?|€|dólares|pavos|en|para|de|por|con|el|la|los|las|un|una/gi, ' ')
    .replace(amountMatch ? amountMatch[0] : '', '')
    .replace(/\s+/g, ' ')
    .trim();

  if (description) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  return { type, accountId, toAccountId, amount, description };
}

export function VoiceButton({ accounts = [], onResult }: VoiceButtonProps) {
  const { flags } = useFeatureFlags();
  const isPreviewMode = flags.exp_voice_preview;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rawTranscript, setRawTranscript] = useState('');
  const [draftType, setDraftType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [draftAccountId, setDraftAccountId] = useState('');
  const [draftToAccountId, setDraftToAccountId] = useState('');
  const [draftAmount, setDraftAmount] = useState('');
  const [draftDescription, setDraftDescription] = useState('');

  const recognitionRef = useRef<any>(null);
  const accountsRef = useRef<Account[]>(accounts);
  const onResultRef = useRef(onResult);
  const previewModeRef = useRef(isPreviewMode);

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    previewModeRef.current = isPreviewMode;
    if (recognitionRef.current) {
      recognitionRef.current.interimResults = isPreviewMode;
    }
  }, [isPreviewMode]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'es-ES';
    recognition.interimResults = previewModeRef.current;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setLiveTranscript('');
    };

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result?.[0]?.transcript || '';

      if (previewModeRef.current && !result.isFinal) {
        setLiveTranscript(transcript);
        return;
      }

      if (previewModeRef.current) {
        setLiveTranscript(transcript);
        const currentAccounts = accountsRef.current;
        const parsed = parseVoiceCommandText(transcript, currentAccounts);

        setRawTranscript(transcript);
        setDraftType(parsed.type || 'expense');
        setDraftAccountId(parsed.accountId || currentAccounts[0]?.id || '');
        setDraftToAccountId(
          parsed.toAccountId ||
            currentAccounts.find((a) => a.id !== (parsed.accountId || currentAccounts[0]?.id))?.id ||
            ''
        );
        setDraftAmount(parsed.amount > 0 ? parsed.amount.toString() : '');
        setDraftDescription(parsed.description || '');
        setPreviewOpen(true);
        return;
      }

      // Legacy direct mode
      const currentAccounts = accountsRef.current;
      const parsed = parseVoiceCommandText(transcript, currentAccounts);

      if (parsed.type === 'transfer') {
        if (!parsed.accountId || !parsed.toAccountId || parsed.accountId === parsed.toAccountId || parsed.amount <= 0) {
          toast.error('Formato inválido. Di: Transferencia de [Cuenta Origen] a [Cuenta Destino] de [Cantidad]');
          return;
        }
        toast.success(
          `Transferencia de ${parsed.amount}€ desde ${currentAccounts.find((a) => a.id === parsed.accountId)?.name} a ${currentAccounts.find((a) => a.id === parsed.toAccountId)?.name}`
        );
      } else {
        if (!parsed.type || !parsed.accountId || parsed.amount <= 0 || !parsed.description) {
          toast.error(
            'Formato inválido. Debes decir: [Ingreso/Gasto], [Nombre de Cuenta], [Cantidad] y [Categoría/Concepto].'
          );
          return;
        }
        toast.success(
          `Entendido: ${parsed.type === 'income' ? 'Ingreso' : 'Gasto'} de ${parsed.amount}€ en ${currentAccounts.find((a) => a.id === parsed.accountId)?.name} para ${parsed.description}`
        );
      }

      onResultRef.current({
        type: parsed.type,
        accountId: parsed.accountId,
        toAccountId: parsed.toAccountId,
        amount: parsed.amount,
        description: parsed.description,
      });
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

  const toggleListening = () => {
    if (!isSupported) {
      toast.error('Tu navegador no soporta reconocimiento de voz');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.interimResults = isPreviewMode;
      }
      recognitionRef.current?.start();
    }
  };

  const handleConfirmPreview = () => {
    const amount = parseAmount(draftAmount);
    if (!draftAccountId || amount <= 0) {
      toast.error('Revisa la cuenta y un importe mayor que 0.');
      return;
    }
    if (draftType === 'transfer') {
      if (!draftToAccountId || draftToAccountId === draftAccountId) {
        toast.error('Selecciona una cuenta destino diferente a la cuenta origen.');
        return;
      }
    } else if (!draftDescription.trim()) {
      toast.error('Introduce una categoría o concepto.');
      return;
    }

    setPreviewOpen(false);
    onResult({
      type: draftType,
      accountId: draftAccountId,
      toAccountId: draftType === 'transfer' ? draftToAccountId : undefined,
      amount,
      description: draftDescription.trim() || 'Transferencia',
    });
  };

  if (!isSupported) return null;

  return (
    <>
      <div className="fixed bottom-24 right-4 sm:right-8 sm:bottom-8 z-50">
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 6 }}
              className="absolute bottom-16 right-0 bg-black/90 backdrop-blur-md text-white text-xs px-3.5 py-2.5 rounded-2xl w-72 shadow-xl border border-white/10 space-y-1.5"
            >
              <div className="font-bold flex items-center gap-2 text-primary-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400 shrink-0" />
                <span>Escuchando comando...</span>
              </div>
              {isPreviewMode && liveTranscript ? (
                <p className="text-xs text-emerald-300 font-semibold leading-snug bg-white/10 rounded-lg px-2 py-1.5">
                  “{liveTranscript}”
                </p>
              ) : (
                <p className="text-[11px] text-white/75 leading-snug">
                  Di por ejemplo:{' '}
                  <span className="text-white font-semibold">
                    "Gasto en {accounts[0]?.name || 'Cuenta'} de 25€ en Supermercado"
                  </span>
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={toggleListening}
          size="icon"
          className={cn(
            'h-14 w-14 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300',
            isListening
              ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white shadow-red-500/50'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          )}
          aria-label="Añadir por voz"
        >
          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>
      </div>

      {isPreviewMode && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Previsualización de Voz
                <Badge variant="outline" className="text-[10px]">
                  Laboratorio
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Revisa o corrige lo reconocido antes de continuar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              {rawTranscript && (
                <div className="p-2.5 rounded-xl bg-muted/60 border border-border/50 text-xs text-muted-foreground">
                  <span className="font-bold text-foreground block mb-0.5">Texto escuchado:</span>
                  “{rawTranscript}”
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {(['expense', 'income', 'transfer'] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={draftType === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDraftType(t)}
                    className="rounded-xl text-xs font-bold"
                  >
                    {t === 'expense' ? 'Gasto' : t === 'income' ? 'Ingreso' : 'Traspaso'}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="voice-amount">Importe (€)</Label>
                  <Input
                    id="voice-amount"
                    inputMode="decimal"
                    value={draftAmount}
                    onChange={(e) => setDraftAmount(e.target.value)}
                    placeholder="0.00"
                    className="tabular-nums font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{draftType === 'transfer' ? 'Cuenta origen' : 'Cuenta'}</Label>
                  <Select value={draftAccountId} onValueChange={setDraftAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {draftType === 'transfer' ? (
                <div className="space-y-1.5">
                  <Label>Cuenta destino</Label>
                  <Select value={draftToAccountId} onValueChange={setDraftToAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((acc) => acc.id !== draftAccountId)
                        .map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="voice-desc">Categoría / Concepto</Label>
                  <Input
                    id="voice-desc"
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value)}
                    placeholder="Ej: Supermercado"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleConfirmPreview} className="gap-1.5">
                <Check className="w-4 h-4" />
                {draftType === 'transfer' ? 'Guardar transferencia' : 'Continuar al formulario'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
