import React, { useState, useEffect } from "react";
import { Calendar, Wallet } from "lucide-react";
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
import { Account } from "@/types/finance";
import { appToast as toast } from "@/lib/swal";
import { useScrollOnFocus } from "@/hooks/useScrollOnFocus";
import { parseAmount } from "@/lib/utils";
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
  defaultAccountId?: string;
}

const LoanModal = ({
  isOpen,
  onClose,
  onSave,
  accounts,
  defaultAccountId,
}: LoanModalProps) => {
  const scrollOnFocus = useScrollOnFocus();
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

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent hideCloseButton={true} className="sm:max-w-[500px] w-full">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="text-xl font-bold">
              Registrar Nuevo Préstamo
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

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
              Crear Préstamo
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default LoanModal;
