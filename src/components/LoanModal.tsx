import React, { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, addMonths } from "date-fns";
import { Home, Landmark, Link2, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Switch } from "./ui/switch";
import { Account, MortgageMetadata, RecurringExpenseRule } from "@/types/finance";
import { formatCurrency } from "@/lib/calculations";
import { appToast as toast } from "@/lib/swal";
import { useScrollOnFocus } from "@/hooks/useScrollOnFocus";
import { cn, parseAmount } from "@/lib/utils";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loanData: any) => void;
  accounts: Account[];
  recurringRules?: RecurringExpenseRule[];
  defaultAccountId?: string;
}

const EMPTY_RULES: RecurringExpenseRule[] = [];

const LoanModal = ({
  isOpen,
  onClose,
  onSave,
  accounts,
  recurringRules = EMPTY_RULES,
  defaultAccountId,
}: LoanModalProps) => {
  const scrollOnFocus = useScrollOnFocus();
  const [mode, setMode] = useState<'loan' | 'mortgage'>('loan');

  // Shared / personal loan fields
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState("");
  const [installments, setInstallments] = useState("12");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [firstInstallmentDate, setFirstInstallmentDate] = useState("");
  const [setupFee, setSetupFee] = useState("");
  const [setupFeeDate, setSetupFeeDate] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [startingPaidAmount, setStartingPaidAmount] = useState("");

  // Mortgage-specific fields
  const [linkedRuleId, setLinkedRuleId] = useState<string>("none");
  const [billingDay, setBillingDay] = useState<string>("31");
  const [category, setCategory] = useState<string>("Vivienda");
  const [pendingPrincipal, setPendingPrincipal] = useState("");
  const [remainingInstallments, setRemainingInstallments] = useState("");
  const [principalPortion, setPrincipalPortion] = useState("");
  const [interestPortion, setInterestPortion] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [indexSpread, setIndexSpread] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [balloonPayment, setBalloonPayment] = useState("");

  const expenseRules = useMemo(
    () => recurringRules.filter((r) => r.type === 'expense'),
    [recurringRules]
  );

  const matchedMortgageRule = useMemo(
    () =>
      expenseRules.find((r) => r.name.toLowerCase().includes('hipoteca')) ||
      expenseRules.find((r) => Math.abs(r.amount - 743.19) < 0.01),
    [expenseRules]
  );

  const deriveBillingDay = (rule?: RecurringExpenseRule): string => {
    if (!rule?.startDate) return "31";
    const dayPart = parseInt(rule.startDate.split("-")[2] || "", 10);
    if (isNaN(dayPart) || dayPart >= 29 || dayPart < 1) return "31";
    return dayPart.toString();
  };

  useEffect(() => {
    if (isOpen) {
      const today = format(new Date(), "yyyy-MM-dd");
      setDate(today);
      setSetupFeeDate(today);
      setFirstInstallmentDate(format(addMonths(new Date(), 1), "yyyy-MM-dd"));

      if (defaultAccountId) {
        setAccountId(defaultAccountId);
      } else if (accounts.length > 0) {
        setAccountId(accounts[0].id);
      }

      setMode('loan');
      setName("");
      setAmount("");
      setInstallments("12");
      setInstallmentAmount("");
      setSetupFee("");
      setIsStarted(false);
      setStartingPaidAmount("");

      setLinkedRuleId(matchedMortgageRule?.id || "none");
      setBillingDay(deriveBillingDay(matchedMortgageRule));
      setCategory(matchedMortgageRule?.category || "Vivienda");
      setPendingPrincipal("");
      setRemainingInstallments("");
      setPrincipalPortion("");
      setInterestPortion("");
      setInterestRate("");
      setIndexSpread("");
      setNextReviewDate("");
      setEndDate("");
      setBalloonPayment("");
    }
  }, [isOpen, defaultAccountId, accounts, matchedMortgageRule]);

  if (!isOpen) return null;

  const handleSelectMode = (nextMode: 'loan' | 'mortgage') => {
    setMode(nextMode);
    if (nextMode === 'mortgage') {
      if (matchedMortgageRule) {
        setLinkedRuleId(matchedMortgageRule.id);
        setAccountId(matchedMortgageRule.accountId);
        setBillingDay(deriveBillingDay(matchedMortgageRule));
        setCategory(matchedMortgageRule.category || "Vivienda");
        if (!installmentAmount) {
          setInstallmentAmount(matchedMortgageRule.amount.toString());
        }
      }
      if (!installments || installments === "12") {
        setInstallments("");
      }
    } else if (!installments) {
      setInstallments("12");
    }
  };

  const handleSelectLinkedRule = (ruleId: string) => {
    setLinkedRuleId(ruleId);
    if (ruleId !== 'none') {
      const rule = expenseRules.find((r) => r.id === ruleId);
      if (rule) {
        setAccountId(rule.accountId);
        setBillingDay(deriveBillingDay(rule));
        setCategory(rule.category || "Vivienda");
        if (!installmentAmount) {
          setInstallmentAmount(rule.amount.toString());
        }
      }
    }
  };

  const handlePrefillMortgage3089 = () => {
    const bbvaAccount =
      accounts.find((a) => a.name.toLowerCase().includes('bbva')) ||
      (matchedMortgageRule ? accounts.find((a) => a.id === matchedMortgageRule.accountId) : undefined);

    setName("Hipoteca *3089");
    setAmount("153302.40");
    setPendingPrincipal("131163.79");
    setInstallments("462");
    setRemainingInstallments("261");
    setInstallmentAmount("743.19");
    setPrincipalPortion("223.45");
    setInterestPortion("519.74");
    setInterestRate("4.755");
    setIndexSpread("Euríbor + 1,90%");
    setNextReviewDate("2027-02-28");
    setEndDate("2048-07-31");
    setBalloonPayment("30000");
    setBillingDay("31");
    setCategory(matchedMortgageRule?.category || "Vivienda");

    if (matchedMortgageRule) {
      setLinkedRuleId(matchedMortgageRule.id);
    }
    if (bbvaAccount) {
      setAccountId(bbvaAccount.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'mortgage') {
      const initialCap = parseAmount(amount);
      const pendingCap = parseAmount(pendingPrincipal);
      const totalInst = parseInt(installments, 10);
      const remInst = parseInt(remainingInstallments, 10);
      const monthlyReceipt = parseAmount(installmentAmount);
      const principalPart = parseAmount(principalPortion || "0");
      const interestPart = parseAmount(interestPortion || "0");
      const rateNum = interestRate ? parseAmount(interestRate) : undefined;
      const balloonNum = balloonPayment ? parseAmount(balloonPayment) : undefined;

      if (
        !name.trim() ||
        !accountId ||
        isNaN(initialCap) ||
        initialCap <= 0 ||
        isNaN(pendingCap) ||
        pendingCap < 0 ||
        pendingCap > initialCap ||
        isNaN(totalInst) ||
        totalInst < 2 ||
        isNaN(remInst) ||
        remInst < 0 ||
        remInst > totalInst ||
        isNaN(monthlyReceipt) ||
        monthlyReceipt <= 0
      ) {
        toast.error("Revisa los campos de la hipoteca: importes, cuotas o cuenta inválidos.");
        return;
      }

      const baselineDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const amortizedBaseline = Number(Math.max(0, initialCap - pendingCap).toFixed(2));
      const paidInstBaseline = Math.max(0, totalInst - remInst);
      const parsedBillingDay = Math.min(31, Math.max(1, parseInt(billingDay, 10) || 31));

      const metadata: MortgageMetadata = {
        isMortgage: true,
        linkedRuleId: undefined,
        billingDay: parsedBillingDay,
        category: category.trim() || "Vivienda",
        pendingPrincipalBaseline: Number(pendingCap.toFixed(2)),
        amortizedPrincipalBaseline: amortizedBaseline,
        paidInstallmentsBaseline: paidInstBaseline,
        baselineDate,
        currentPrincipalPortion: isNaN(principalPart) ? 0 : Number(principalPart.toFixed(2)),
        currentInterestPortion: isNaN(interestPart) ? 0 : Number(interestPart.toFixed(2)),
        interestRate: rateNum !== undefined && !isNaN(rateNum) ? rateNum : undefined,
        indexSpread: indexSpread.trim() || undefined,
        nextReviewDate: nextReviewDate || undefined,
        endDate: endDate || undefined,
        balloonPayment: balloonNum !== undefined && !isNaN(balloonNum) && balloonNum > 0 ? balloonNum : undefined,
      };

      onSave({
        name: name.trim(),
        amount: initialCap,
        accountId,
        date: baselineDate,
        installments: totalInst,
        installmentAmount: monthlyReceipt,
        firstInstallmentDate: baselineDate,
        setupFee: 0,
        setupFeeDate: baselineDate,
        isStarted: true,
        startingPaidAmount: amortizedBaseline,
        originalTransactionData: metadata,
        absorbRuleId: linkedRuleId !== "none" ? linkedRuleId : undefined,
      });
      return;
    }

    const amountNum = parseAmount(amount);
    const instNum = parseInt(installments, 10);
    const instAmountNum = parseAmount(installmentAmount);
    const feeNum = parseAmount(setupFee || "0");

    if (
      !name ||
      isNaN(amountNum) ||
      amountNum <= 0 ||
      isNaN(instNum) ||
      instNum < 2 ||
      isNaN(instAmountNum) ||
      instAmountNum <= 0 ||
      !firstInstallmentDate ||
      !accountId
    ) {
      toast.error("Por favor, revisa todos los datos introducidos.");
      return;
    }

    onSave({
      name,
      amount: amountNum,
      accountId,
      date,
      installments: instNum,
      installmentAmount: instAmountNum,
      firstInstallmentDate,
      setupFee: isNaN(feeNum) ? 0 : feeNum,
      setupFeeDate: setupFeeDate || date,
      isStarted,
      startingPaidAmount: isStarted ? parseAmount(startingPaidAmount || "0") : 0,
    });
  };

  const initialCapPreview = parseAmount(amount);
  const pendingCapPreview = parseAmount(pendingPrincipal);
  const totalInstPreview = parseInt(installments, 10);
  const remInstPreview = parseInt(remainingInstallments, 10);
  const hasMortgagePreview =
    !isNaN(initialCapPreview) &&
    initialCapPreview > 0 &&
    !isNaN(pendingCapPreview) &&
    pendingCapPreview >= 0 &&
    !isNaN(totalInstPreview) &&
    totalInstPreview > 0 &&
    !isNaN(remInstPreview) &&
    remInstPreview >= 0;

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent hideCloseButton={true} className="sm:max-w-[540px] w-full">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="text-xl font-bold">
              {mode === 'mortgage' ? 'Registrar Hipoteca' : 'Registrar Nuevo Préstamo'}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => handleSelectMode('loan')}
              className={cn(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                mode === 'loan'
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Landmark className="w-3.5 h-3.5 shrink-0" />
              <span>Préstamo personal</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMode('mortgage')}
              className={cn(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                mode === 'mortgage'
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span>Hipoteca</span>
            </button>
          </div>

          {mode === 'mortgage' ? (
            <div className="space-y-4">
              {/* Quick prefill button for Hipoteca *3089 */}
              <Button
                type="button"
                variant="outline"
                onClick={handlePrefillMortgage3089}
                className="w-full justify-center gap-2 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs h-10 rounded-xl"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Rellenar con datos de Hipoteca *3089</span>
              </Button>

              {expenseRules.length > 0 && (
                <div className="space-y-2">
                  <Label>Migrar y quitar de Gastos Fijos (opcional)</Label>
                  <Select value={linkedRuleId} onValueChange={handleSelectLinkedRule}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecciona si quieres migrar una regla antigua" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Crear autónoma (no eliminar reglas)</SelectItem>
                      {expenseRules.map((rule) => (
                        <SelectItem key={rule.id} value={rule.id}>
                          <span className="inline-flex items-center gap-1.5">
                            <Link2 className="w-3.5 h-3.5 opacity-60" />
                            {rule.name} ({formatCurrency(rule.amount)})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Tu hipoteca se gestionará 100% aquí en Préstamos y generará sus recibos mensuales en Inicio. Si eliges tu antigua regla, se copiará su categoría y se eliminará de Gastos Fijos para evitar duplicados.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre de la hipoteca</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Hipoteca *3089"
                    className="h-11"
                    onFocus={scrollOnFocus}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cuenta de cargo</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="h-11">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Día de cobro mensual</Label>
                  <Select value={billingDay} onValueChange={setBillingDay}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Día de cobro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="31">Último día del mes (30/31)</SelectItem>
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                          Día {d} de cada mes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Categoría en Inicio</Label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ej: Vivienda"
                    className="h-11"
                    onFocus={scrollOnFocus}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Capital inicial (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ej: 153302.40"
                    className="h-11"
                    onFocus={scrollOnFocus}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Capital pendiente hoy (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={pendingPrincipal}
                    onChange={(e) => setPendingPrincipal(e.target.value)}
                    placeholder="Ej: 131163.79"
                    className="h-11"
                    onFocus={scrollOnFocus}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Cuotas totales</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                    placeholder="Ej: 462"
                    className="h-11"
                    onFocus={scrollOnFocus}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cuotas pendientes hoy</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={remainingInstallments}
                    onChange={(e) => setRemainingInstallments(e.target.value)}
                    placeholder="Ej: 261"
                    className="h-11"
                    onFocus={scrollOnFocus}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border/60 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Recibo actual y condiciones
                </h3>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Recibo mensual (€)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={installmentAmount}
                      onChange={(e) => setInstallmentAmount(e.target.value)}
                      placeholder="743.19"
                      className="h-10 text-sm"
                      onFocus={scrollOnFocus}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Principal (€)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={principalPortion}
                      onChange={(e) => setPrincipalPortion(e.target.value)}
                      placeholder="223.45"
                      className="h-10 text-sm"
                      onFocus={scrollOnFocus}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Intereses (€)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={interestPortion}
                      onChange={(e) => setInterestPortion(e.target.value)}
                      placeholder="519.74"
                      className="h-10 text-sm"
                      onFocus={scrollOnFocus}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">TIN actual (%)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      placeholder="4.755"
                      className="h-10 text-sm"
                      onFocus={scrollOnFocus}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Diferencial / Índice</Label>
                    <Input
                      value={indexSpread}
                      onChange={(e) => setIndexSpread(e.target.value)}
                      placeholder="Euríbor + 1,90%"
                      className="h-10 text-sm"
                      onFocus={scrollOnFocus}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Próx. revisión</Label>
                    <Input
                      type="date"
                      value={nextReviewDate}
                      onChange={(e) => setNextReviewDate(e.target.value)}
                      className="h-10 text-xs px-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Vencimiento</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-10 text-xs px-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Cuota final (€)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={balloonPayment}
                      onChange={(e) => setBalloonPayment(e.target.value)}
                      placeholder="30000"
                      className="h-10 text-sm"
                      onFocus={scrollOnFocus}
                    />
                  </div>
                </div>
              </div>

              {hasMortgagePreview && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amortizado hasta hoy:</span>
                    <strong className="text-foreground">
                      {formatCurrency(Math.max(0, initialCapPreview - pendingCapPreview))}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cuotas ya pagadas:</span>
                    <strong className="text-foreground">
                      {Math.max(0, totalInstPreview - remInstPreview)} de {totalInstPreview}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Concepto del Préstamo</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Coche, Reforma, etc."
                  required
                  className="h-12"
                  enterKeyHint="next"
                  onFocus={scrollOnFocus}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cantidad Prestada</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ej: 5000"
                    required
                    className="h-12"
                    enterKeyHint="next"
                    onFocus={scrollOnFocus}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Ingreso</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={isStarted}
                    required={!isStarted}
                    className="h-12"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between space-y-0 rounded-lg border p-4 border-border/50 bg-secondary/30">
                <div className="space-y-0.5">
                  <Label className="text-sm cursor-pointer">
                    Este préstamo ya está en curso
                  </Label>
                  <p className="text-xs text-muted-foreground">No inyectar ingreso</p>
                </div>
                <Switch
                  checked={isStarted}
                  onCheckedChange={setIsStarted}
                />
              </div>

              {isStarted && (
                <div className="space-y-2 bg-primary/5 p-4 rounded-lg border border-primary/20 animate-in fade-in zoom-in-95">
                  <Label>Cantidad ya pagada históricamente</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={startingPaidAmount}
                    onChange={(e) => setStartingPaidAmount(e.target.value)}
                    placeholder="Ej: 1500"
                    className="h-12"
                    enterKeyHint="next"
                    onFocus={scrollOnFocus}
                  />
                  <p className="text-xs text-muted-foreground">
                    Esta cantidad se sumará directamente a tu progreso sin crear transacciones pasadas duplicadas.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Cuenta de Ingreso y Cobro</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="h-12">
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

              <div className="pt-4 border-t border-border space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Condiciones de Devolución</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Nº Cuotas</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      required
                      className="h-12"
                      enterKeyHint="next"
                      onFocus={scrollOnFocus}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Importe Cuota Real</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={installmentAmount}
                      onChange={(e) => setInstallmentAmount(e.target.value)}
                      required
                      className="h-12"
                      enterKeyHint="next"
                      onFocus={scrollOnFocus}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Fecha 1ª Cuota</Label>
                    <Input
                      type="date"
                      value={firstInstallmentDate}
                      onChange={(e) => setFirstInstallmentDate(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Comisión Apertura</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={setupFee}
                      onChange={(e) => setSetupFee(e.target.value)}
                      placeholder="Ej: 50"
                      className="h-12"
                      enterKeyHint="done"
                      onFocus={scrollOnFocus}
                    />
                  </div>
                  {parseAmount(setupFee) > 0 && (
                    <div className="space-y-2 col-span-2">
                      <Label className="text-xs">Fecha Cobro Comisión</Label>
                      <Input
                        type="date"
                        value={setupFeeDate}
                        onChange={(e) => setSetupFeeDate(e.target.value)}
                        required
                        className="h-12"
                      />
                    </div>
                  )}
                </div>

                {installments && installmentAmount && amount && (
                  <div className="mt-2 p-3 bg-secondary/50 rounded-lg text-sm">
                    {(() => {
                      const feeValue = parseAmount(setupFee || "0");
                      const startingPaid = isStarted ? parseAmount(startingPaidAmount || "0") : 0;
                      const totalReal =
                        parseInt(installments) * parseAmount(installmentAmount) + feeValue + startingPaid;
                      const original = parseAmount(amount);
                      if (!isNaN(totalReal) && !isNaN(original)) {
                        const extra = totalReal - original;
                        return (
                          <p>
                            Devolverás un total de <strong>{totalReal.toFixed(2)}€</strong>{" "}
                            {extra > 0 && (
                              <span className="text-amber-500">
                                (Intereses/Comisiones: {extra.toFixed(2)}€)
                              </span>
                            )}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="sticky bottom-[-1.5rem] z-20 -mb-6 -mx-6 px-6 pb-6 pt-4 bg-background border-t border-border/30 flex gap-3 mt-2 pb-safe">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-14 text-base font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 h-14 text-base font-bold text-white shadow-lg"
            >
              {mode === 'mortgage' ? 'Guardar Hipoteca' : 'Crear Préstamo'}
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default LoanModal;
