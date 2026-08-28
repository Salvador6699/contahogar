import { useState } from 'react';
import { useGeminiAdvisor } from '@/hooks/useGeminiAdvisor';
import { Sparkles, KeyRound, Loader2, ShieldAlert, ArrowRight, Save, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AsistentePage = () => {
  const { apiKey, saveApiKey, clearApiKey, generateReport, report, loading, error, hasTransactions } = useGeminiAdvisor();
  const [inputValue, setInputValue] = useState('');

  const handleSaveKey = () => {
    if (inputValue.trim()) {
      saveApiKey(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Sparkles className="w-8 h-8" />
          </div>
          Asistente IA
        </h1>
        <p className="text-muted-foreground font-medium">
          Tu asesor financiero personal impulsado por Google Gemini.
        </p>
      </div>

      {/* API Key Form */}
      {!apiKey ? (
        <div className="bg-card border border-border/50 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4 text-primary">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">Configura tu API Key</h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Para proteger tu privacidad y mantener este servicio gratuito, necesitamos que proporciones tu propia clave de API de Gemini. 
            Esta clave <strong>se guarda exclusivamente en tu navegador</strong> y solo se envía directamente a los servidores de Google para generar tus informes.
          </p>
          
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 p-4 rounded-xl text-sm flex gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-1">¿No tienes una API Key?</strong>
              Puedes obtener una de forma gratuita en{' '}
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="underline font-bold hover:text-blue-500 transition-colors"
              >
                Google AI Studio
              </a>.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="password"
              placeholder="Pega tu API Key de Gemini (AIzaSy...)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            <button
              onClick={handleSaveKey}
              disabled={!inputValue.trim()}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" /> Guardar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                API Key configurada
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Tu Asistente IA está listo para analizar tus datos.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={clearApiKey}
                className="text-destructive bg-destructive/10 hover:bg-destructive/20 font-bold px-4 py-2 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Borrar Key
              </button>
              
              <button
                onClick={generateReport}
                disabled={loading || !hasTransactions}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-2 rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-primary/20 disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Analizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Generar Informe
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Errors */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          
          {/* No transactions warning */}
          {!hasTransactions && !error && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-500 p-4 rounded-xl flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">Aún no tienes transacciones. Añade ingresos o gastos para que la IA pueda analizarlos.</p>
            </div>
          )}

          {/* Report output */}
          {report && (
            <div className="bg-card border border-border/50 rounded-3xl p-6 lg:p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/10">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg">Informe Financiero</h3>
              </div>
              
              <div className="prose prose-sm md:prose-base prose-neutral dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {report}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AsistentePage;
