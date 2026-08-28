import { useState, useCallback } from 'react';
import { useTransactions } from './useTransactions';
import { useCategories } from './useCategories';
import { useTeam } from '@/contexts/TeamContext';

export const useGeminiAdvisor = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('contahogar_gemini_api_key') || '');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { transactions } = useTransactions();
  const { activeTeam } = useTeam();

  const saveApiKey = (key: string) => {
    localStorage.setItem('contahogar_gemini_api_key', key);
    setApiKey(key);
  };

  const clearApiKey = () => {
    localStorage.removeItem('contahogar_gemini_api_key');
    setApiKey('');
    setReport('');
    setError('');
  };

  const generateReport = useCallback(async () => {
    if (!apiKey) {
      setError('Por favor, introduce tu API Key de Gemini.');
      return;
    }
    
    if (transactions.length === 0) {
      setError('No hay transacciones suficientes para analizar.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Filtrar últimos 3 meses y excluir transferencias
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const relevantTransactions = transactions.filter(t => {
        if ((t.type as string) === 'transfer') return false;
        
        const txDate = new Date(t.date);
        return txDate >= threeMonthsAgo;
      });

      // Preparar los datos
      const expenses = relevantTransactions.filter(t => t.type === 'expense');
      const incomes = relevantTransactions.filter(t => t.type === 'income');
      
      const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
      const totalIncomes = incomes.reduce((sum, t) => sum + t.amount, 0);
      const balance = totalIncomes - totalExpenses;
      
      // Resumir por categoría
      const expensesByCategory = expenses.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

      // Crear el prompt con los datos
      const promptData = `
        **Resumen Financiero del equipo "${activeTeam?.name || 'Personal'}" (Últimos 3 meses):**
        - Total Ingresos: $${totalIncomes.toFixed(2)}
        - Total Gastos: $${totalExpenses.toFixed(2)}
        - Balance: $${balance.toFixed(2)}
        
        **Gastos por Categoría (Últimos 3 meses):**
        ${Object.entries(expensesByCategory).map(([cat, amount]) => `- ${cat}: $${amount.toFixed(2)}`).join('\n')}
        
        **Transacciones Recientes (Últimas 20 relevantes):**
        ${relevantTransactions.slice(0, 20).map(t => `- ${t.date} | ${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)} | ${t.category} | ${t.description}`).join('\n')}
      `;

      const systemInstruction = `
      Eres el Asistente Financiero personal de ContaHogar, una aplicación de finanzas del hogar.
      Tu objetivo es analizar los datos financieros que te proporciona el usuario y devolver un informe estructurado.
      
      Reglas del informe:
      1. Usa formato Markdown (usa negritas, listas, tablas si es necesario).
      2. Sé claro, profesional pero amigable. 
      3. Empieza con un resumen rápido de su estado basado en los últimos 3 meses.
      4. Identifica tendencias o áreas donde están gastando más.
      5. Dale 2-3 recomendaciones prácticas y accionables para mejorar su salud financiera.
      6. No menciones que eres una IA, asume tu rol de Asistente Financiero de ContaHogar.
      7. Dirígete al usuario en español.
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: { text: systemInstruction }
          },
          contents: [
            { role: 'user', parts: [{ text: promptData }] }
          ],
          generationConfig: {
            temperature: 0.7,
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Error en la API de Gemini');
      }

      const data = await response.json();
      const reportText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      setReport(reportText || 'No se pudo generar el informe.');
    } catch (err: any) {
      console.error('Error al generar informe Gemini:', err);
      setError(err.message || 'Error al conectar con Gemini. Verifica tu API Key.');
    } finally {
      setLoading(false);
    }
  }, [apiKey, transactions, activeTeam]);

  return {
    apiKey,
    saveApiKey,
    clearApiKey,
    generateReport,
    report,
    loading,
    error,
    hasTransactions: transactions.length > 0
  };
};
