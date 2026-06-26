import React, { useState, useEffect } from "react";
import { X, Calendar, Wallet } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Account } from "@/types/finance";
import { toast } from "sonner";

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loanData: any) => void;
  accounts: Account[];
  defaultAccountId?: string;
}

const LoanModal = ({
  isOpen,
  onClose,
  onSave,
  accounts,
  defaultAccountId,
}: LoanModalProps) => {
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

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split("T")[0];
      setDate(today);
      setSetupFeeDate(today);

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setFirstInstallmentDate(nextMonth.toISOString().split("T")[0]);

      if (defaultAccountId) {
        setAccountId(defaultAccountId);
      } else if (accounts.length > 0) {
        setAccountId(accounts[0].id);
      }

      setName("");
      setAmount("");
      setInstallments("12");
      setInstallmentAmount("");
      setSetupFee("");
      setIsStarted(false);
      setStartingPaidAmount("");
    }
  }, [isOpen, defaultAccountId, accounts]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    const instNum = parseInt(installments, 10);
    const instAmountNum = parseFloat(installmentAmount);
    const feeNum = parseFloat(setupFee || "0");

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
      startingPaidAmount: isStarted ? parseFloat(startingPaidAmount || "0") : 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Registrar Nuevo Préstamo</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 overflow-y-auto">
          <form id="loan-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Concepto del Préstamo</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Coche, Reforma, etc."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cantidad Prestada</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ej: 5000"
                  required
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
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-secondary/30 p-3 rounded-lg border border-border/50">
              <input
                type="checkbox"
                id="isStarted"
                checked={isStarted}
                onChange={(e) => setIsStarted(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isStarted" className="text-sm cursor-pointer">
                Este préstamo ya está en curso (No inyectar ingreso)
              </Label>
            </div>

            {isStarted && (
              <div className="space-y-2 bg-primary/5 p-4 rounded-lg border border-primary/20 animate-in fade-in zoom-in-95">
                <Label>Cantidad ya pagada históricamente</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={startingPaidAmount}
                  onChange={(e) => setStartingPaidAmount(e.target.value)}
                  placeholder="Ej: 1500"
                />
                <p className="text-xs text-muted-foreground">
                  Esta cantidad se sumará directamente a tu progreso sin crear transacciones pasadas duplicadas.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Cuenta de Ingreso y Cobro</Label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-border space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Condiciones de Devolución</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Nº Cuotas</Label>
                  <Input
                    type="number"
                    min="2"
                    step="1"
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Importe Cuota Real</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Fecha 1ª Cuota</Label>
                  <Input
                    type="date"
                    value={firstInstallmentDate}
                    onChange={(e) => setFirstInstallmentDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Comisión Apertura</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={setupFee}
                    onChange={(e) => setSetupFee(e.target.value)}
                    placeholder="Ej: 50"
                  />
                </div>
                {parseFloat(setupFee) > 0 && (
                  <div className="space-y-2 col-span-2">
                    <Label className="text-xs">Fecha Cobro Comisión</Label>
                    <Input
                      type="date"
                      value={setupFeeDate}
                      onChange={(e) => setSetupFeeDate(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              {installments && installmentAmount && amount && (
                <div className="mt-2 p-3 bg-secondary/50 rounded-lg text-sm">
                  {(() => {
                    const feeValue = parseFloat(setupFee || "0") || 0;
                    const startingPaid = isStarted ? parseFloat(startingPaidAmount || "0") || 0 : 0;
                    const totalReal =
                      parseInt(installments) * parseFloat(installmentAmount) + feeValue + startingPaid;
                    const original = parseFloat(amount);
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
          </form>
        </div>

        <div className="p-4 border-t border-border mt-auto">
          <Button type="submit" form="loan-form" className="w-full">
            Crear Préstamo
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoanModal;
