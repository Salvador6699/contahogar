import {
  Account,
  Category,
  CategoryKind,
  CategoryNature,
  FinanceData,
  Transaction,
  normalizeCategoryName,
} from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { calculateAccountBalance, isTransfer } from "@/lib/calculations";
import { createSnapshotFromCloud, getFullCloudData } from "@/api/local/snapshots";

export interface GroupBlueprint {
  name: string;
  kind: CategoryKind;
  nature: CategoryNature | null;
  icon: string;
  color: string;
}

export interface SubcategoryRule {
  /** Normalized source category names that map to this subcategory */
  matchNorms: string[];
  /** Canonical trimmed name (if null, keeps existing trimmed name) */
  canonicalName?: string;
  groupName: string;
  kind: CategoryKind;
  nature: CategoryNature | null;
  isArchived?: boolean;
  icon?: string;
  color?: string;
}

export const TAXONOMY_GROUPS: GroupBlueprint[] = [
  { name: "Vivienda", kind: "expense", nature: "essential", icon: "Home", color: "#2563eb" },
  { name: "Alimentación", kind: "expense", nature: "essential", icon: "ShoppingCart", color: "#16a34a" },
  { name: "Transporte", kind: "expense", nature: "essential", icon: "Car", color: "#0284c7" },
  { name: "Salud", kind: "expense", nature: "essential", icon: "Stethoscope", color: "#0d9488" },
  { name: "Familia y Educación", kind: "expense", nature: "essential", icon: "GraduationCap", color: "#4f46e5" },
  { name: "Mascotas", kind: "expense", nature: "essential", icon: "Cat", color: "#d97706" },
  { name: "Trabajo (Profesional)", kind: "expense", nature: "essential", icon: "Briefcase", color: "#475569" },
  { name: "Estilo de vida y Ocio", kind: "expense", nature: "discretionary", icon: "Sparkles", color: "#e11d48" },
  { name: "Financiero y Extraordinarios", kind: "expense", nature: "debt", icon: "Landmark", color: "#7c3aed" },
  { name: "Ingresos ordinarios", kind: "income", nature: null, icon: "Wallet", color: "#10b981" },
  { name: "Ingresos extraordinarios", kind: "income", nature: null, icon: "Coins", color: "#059669" },
  { name: "Financiación", kind: "financing", nature: null, icon: "CreditCard", color: "#6366f1" },
];

export const SUBCATEGORY_RULES: SubcategoryRule[] = [
  // 1. Vivienda
  { matchNorms: ["hipoteca"], groupName: "Vivienda", kind: "expense", nature: "essential" },
  { matchNorms: ["comunidad"], groupName: "Vivienda", kind: "expense", nature: "essential" },
  { matchNorms: ["luz"], groupName: "Vivienda", kind: "expense", nature: "essential" },
  { matchNorms: ["agua"], groupName: "Vivienda", kind: "expense", nature: "essential" },
  { matchNorms: ["telefonia e internet", "telefonía e internet"], groupName: "Vivienda", kind: "expense", nature: "essential" },
  { matchNorms: ["ayto de alzira (contribución)", "ayto de alzira (contribucion)"], groupName: "Vivienda", kind: "expense", nature: "essential" },
  { matchNorms: ["tributos basura"], groupName: "Vivienda", kind: "expense", nature: "essential" },
  { matchNorms: ["seguros"], groupName: "Vivienda", kind: "expense", nature: "essential" },
  { matchNorms: ["menaje"], groupName: "Vivienda", kind: "expense", nature: "essential" },

  // 2. Alimentación
  { matchNorms: ["supermercado"], groupName: "Alimentación", kind: "expense", nature: "essential" },

  // 3. Transporte
  { matchNorms: ["gasoleo", "gasóleo"], groupName: "Transporte", kind: "expense", nature: "essential" },
  { matchNorms: ["mantenimiento coche"], canonicalName: "Mantenimiento coche", groupName: "Transporte", kind: "expense", nature: "essential" },
  { matchNorms: ["transporte  vari", "transporte vari"], canonicalName: "Transporte Vari", groupName: "Transporte", kind: "expense", nature: "essential" },

  // 4. Salud
  { matchNorms: ["salud y farmacia"], groupName: "Salud", kind: "expense", nature: "essential" },
  { matchNorms: ["dentista"], canonicalName: "Dentista", groupName: "Salud", kind: "expense", nature: "essential" },
  { matchNorms: ["psicologa", "psicóloga"], groupName: "Salud", kind: "expense", nature: "essential" },

  // 5. Familia y Educación
  { matchNorms: ["estudios varinia"], groupName: "Familia y Educación", kind: "expense", nature: "essential" },
  { matchNorms: ["paga varinia"], groupName: "Familia y Educación", kind: "expense", nature: "essential" },
  { matchNorms: ["udemy"], groupName: "Familia y Educación", kind: "expense", nature: "essential" },

  // 6. Mascotas
  { matchNorms: ["mascotas"], groupName: "Mascotas", kind: "expense", nature: "essential" },

  // 7. Trabajo (Profesional)
  { matchNorms: ["herramientas"], canonicalName: "Herramientas", groupName: "Trabajo (Profesional)", kind: "expense", nature: "essential" },

  // 8. Estilo de vida y Ocio
  { matchNorms: ["tabaco"], groupName: "Estilo de vida y Ocio", kind: "expense", nature: "discretionary" },
  { matchNorms: ["bar/restaurante"], groupName: "Estilo de vida y Ocio", kind: "expense", nature: "discretionary" },
  { matchNorms: ["ocio"], groupName: "Estilo de vida y Ocio", kind: "expense", nature: "discretionary" },
  { matchNorms: ["spotify"], groupName: "Estilo de vida y Ocio", kind: "expense", nature: "discretionary" },
  { matchNorms: ["gemini"], groupName: "Estilo de vida y Ocio", kind: "expense", nature: "discretionary" },
  { matchNorms: ["gimnasio"], groupName: "Estilo de vida y Ocio", kind: "expense", nature: "discretionary" },
  { matchNorms: ["yoga"], groupName: "Estilo de vida y Ocio", kind: "expense", nature: "discretionary" },
  { matchNorms: ["ropa / calzado"], groupName: "Estilo de vida y Ocio", kind: "expense", nature: "discretionary" },
  { matchNorms: ["cuidado personal"], groupName: "Estilo de vida y Ocio", kind: "expense", nature: "discretionary" },
  { matchNorms: ["hobby"], canonicalName: "Hobby", groupName: "Estilo de vida y Ocio", kind: "expense", nature: "discretionary" },
  { matchNorms: ["lotería", "loteria"], canonicalName: "Lotería", groupName: "Estilo de vida y Ocio", kind: "expense", nature: "discretionary" },

  // 9. Financiero y Extraordinarios
  { matchNorms: ["devolución préstamo", "devolucion prestamo"], canonicalName: "Devolución Préstamo", groupName: "Financiero y Extraordinarios", kind: "expense", nature: "debt" },
  { matchNorms: ["comisiones bancarias", "gastos bancarios", "gastos bancarios ?"], canonicalName: "Comisiones bancarias", groupName: "Financiero y Extraordinarios", kind: "expense", nature: "debt", icon: "Landmark", color: "#7c3aed" },
  { matchNorms: ["ong´s", "ongs", "ong's"], groupName: "Financiero y Extraordinarios", kind: "expense", nature: "discretionary" },
  { matchNorms: ["alquiler piso", "alquiler temporal"], groupName: "Financiero y Extraordinarios", kind: "expense", nature: "extraordinary", isArchived: true },
  { matchNorms: ["varios/imprevistos"], groupName: "Financiero y Extraordinarios", kind: "expense", nature: "extraordinary" },

  // Ingresos ordinarios
  { matchNorms: ["salvador"], groupName: "Ingresos ordinarios", kind: "income", nature: null },
  { matchNorms: ["yasmina"], groupName: "Ingresos ordinarios", kind: "income", nature: null },

  // Ingresos extraordinarios
  { matchNorms: ["ingreso extra"], groupName: "Ingresos extraordinarios", kind: "income", nature: null },

  // Financiación (excluidos de ingresos reales)
  { matchNorms: ["préstamo recibido", "prestamo recibido"], canonicalName: "Préstamo recibido", groupName: "Financiación", kind: "financing", nature: null, icon: "CreditCard", color: "#6366f1" },
  { matchNorms: ["anticipo nómina", "anticipo nomina"], canonicalName: "Anticipo nómina", groupName: "Financiación", kind: "financing", nature: null, isArchived: true },
];

export interface DevengoNettingPair {
  month: string;
  devengoTx: Transaction;
  incomeTx: Transaction;
  newIncomeAmount: number;
}

export interface FinancingSplitItem {
  tx: Transaction;
  targetCategory: string;
  reason: string;
}

export interface DuplicateCleanupItem {
  rawNames: string[];
  targetName: string;
  affectedTxCount: number;
}

export interface UnmatchedTransferItem {
  tx: Transaction;
  accountName: string;
}

export interface MigrationPlan {
  groupsToCreate: GroupBlueprint[];
  duplicateCleanups: DuplicateCleanupItem[];
  devengoPairs: DevengoNettingPair[];
  financingSplits: FinancingSplitItem[];
  categoriesToClassifyCount: number;
  unmatchedTransfers: UnmatchedTransferItem[];
  hasPendingWork: boolean;
}

export interface AccountBalanceCheck {
  accountId: string;
  accountName: string;
  before: number;
  after: number;
  diff: number;
}

export interface MigrationExecutionResult {
  snapshotId: string;
  groupsCreated: number;
  categoriesUpdated: number;
  duplicatesMerged: number;
  devengosNetted: number;
  financingTransactionsMoved: number;
  balanceChecks: AccountBalanceCheck[];
  allBalancesMatch: boolean;
}

const findRuleForName = (name: string): SubcategoryRule | undefined => {
  const norm = normalizeCategoryName(name);
  return SUBCATEGORY_RULES.find((r) => r.matchNorms.includes(norm));
};

export const buildMigrationPlan = (data: FinanceData): MigrationPlan => {
  const existingGroupNorms = new Set(
    data.categories.filter((c) => Boolean(c.isGroup)).map((c) => normalizeCategoryName(c.name))
  );

  const groupsToCreate = TAXONOMY_GROUPS.filter(
    (g) => !existingGroupNorms.has(normalizeCategoryName(g.name))
  );

  // 1. Detect duplicate/whitespace category names across transactions & categories
  const normToRaw = new Map<string, Set<string>>();
  const addRaw = (raw: string) => {
    const rule = findRuleForName(raw);
    const key = rule?.canonicalName ? normalizeCategoryName(rule.canonicalName) : normalizeCategoryName(raw);
    if (!key || isTransfer(raw)) return;
    if (!normToRaw.has(key)) normToRaw.set(key, new Set());
    normToRaw.get(key)!.add(raw);
  };
  data.categories.filter((c) => !c.isGroup).forEach((c) => addRaw(c.name));
  data.transactions.forEach((t) => addRaw(t.category));

  const duplicateCleanups: DuplicateCleanupItem[] = [];
  for (const [normKey, rawSet] of normToRaw.entries()) {
    const rawList = Array.from(rawSet);
    const rule = SUBCATEGORY_RULES.find(
      (r) =>
        (r.canonicalName && normalizeCategoryName(r.canonicalName) === normKey) ||
        r.matchNorms.includes(normKey)
    );
    const targetName = rule?.canonicalName || rawList[0].trim();
    const needsCleanup =
      rawList.length > 1 || rawList.some((r) => r !== targetName);
    if (needsCleanup) {
      const affectedTxCount = data.transactions.filter(
        (t) => rawList.includes(t.category) && t.category !== targetName
      ).length;
      if (affectedTxCount > 0 || rawList.length > 1) {
        duplicateCleanups.push({
          rawNames: rawList.filter((r) => r !== targetName),
          targetName,
          affectedTxCount,
        });
      }
    }
  }

  // 2. Detect Devengos nomina -> Salvador netting pairs (Opción A)
  const devengoTxs = data.transactions.filter(
    (t) =>
      !t.isPending &&
      t.type === "expense" &&
      normalizeCategoryName(t.category) === "devengos nomina"
  );
  const salvadorIncomes = data.transactions.filter(
    (t) =>
      !t.isPending &&
      t.type === "income" &&
      normalizeCategoryName(t.category) === "salvador"
  );

  const usedIncomeIds = new Set<string>();
  const devengoPairs: DevengoNettingPair[] = [];

  for (const dtx of devengoTxs) {
    const dMonth = dtx.date.slice(0, 7);
    const dTime = new Date(dtx.date + "T12:00:00").getTime();

    const candidates = salvadorIncomes
      .filter(
        (itx) =>
          !usedIncomeIds.has(itx.id) &&
          itx.accountId === dtx.accountId &&
          itx.date.slice(0, 7) === dMonth &&
          itx.amount > dtx.amount
      )
      .sort(
        (a, b) =>
          Math.abs(new Date(a.date + "T12:00:00").getTime() - dTime) -
          Math.abs(new Date(b.date + "T12:00:00").getTime() - dTime)
      );

    if (candidates.length > 0) {
      const match = candidates[0];
      usedIncomeIds.add(match.id);
      devengoPairs.push({
        month: dMonth,
        devengoTx: dtx,
        incomeTx: match,
        newIncomeAmount: Number((match.amount - dtx.amount).toFixed(2)),
      });
    }
  }

  // 3. Detect Financing splits (Prestamo Tarjeta income/expense & Ingresos loan)
  const financingSplits: FinancingSplitItem[] = [];
  for (const tx of data.transactions) {
    const norm = normalizeCategoryName(tx.category);
    if (norm === "prestamo tarjeta" && tx.type === "income") {
      financingSplits.push({
        tx,
        targetCategory: "Préstamo recibido",
        reason: "Préstamo recibido clasificado como ingreso → Financiación",
      });
    } else if (norm === "prestamo tarjeta" && tx.type === "expense") {
      financingSplits.push({
        tx,
        targetCategory: "Devolución Préstamo",
        reason: "Cuota de tarjeta → unificada en Devolución Préstamo (Deuda)",
      });
    } else if (
      norm === "ingresos" &&
      tx.type === "income" &&
      (tx.description || "").toLowerCase().includes("préstamo")
    ) {
      financingSplits.push({
        tx,
        targetCategory: "Préstamo recibido",
        reason: "Ingreso de préstamo → Financiación",
      });
    }
  }

  // 4. Count categories that still need group/kind/nature assignment
  let categoriesToClassifyCount = 0;
  for (const cat of data.categories.filter((c) => !c.isGroup)) {
    const rule = findRuleForName(cat.name);
    if (!rule) continue;
    const parentGroup = data.categories.find(
      (g) => g.isGroup && normalizeCategoryName(g.name) === normalizeCategoryName(rule.groupName)
    );
    const missingParent = !parentGroup || cat.parentId !== parentGroup.id;
    const missingKind = cat.kind !== rule.kind;
    const missingNature = (cat.nature ?? null) !== (rule.nature ?? null);
    const missingArchive = Boolean(cat.isArchived) !== Boolean(rule.isArchived);
    if (missingParent || missingKind || missingNature || missingArchive) {
      categoriesToClassifyCount++;
    }
  }

  // 5. Detect unmatched confirmed transfers (informational only)
  const accountNameById = new Map<string, string>(data.accounts.map((a) => [a.id, a.name]));
  const transferGroups = new Map<string, Transaction[]>();
  data.transactions
    .filter((t) => !t.isPending && isTransfer(t.category))
    .forEach((t) => {
      const k = `${t.date}|${t.amount.toFixed(2)}`;
      const list = transferGroups.get(k) || [];
      list.push(t);
      transferGroups.set(k, list);
    });

  const unmatchedTransfers: UnmatchedTransferItem[] = [];
  for (const list of transferGroups.values()) {
    const outs = list.filter((t) => t.type === "expense");
    const ins = list.filter((t) => t.type === "income");
    if (outs.length !== ins.length) {
      const extra = outs.length > ins.length ? outs.slice(ins.length) : ins.slice(outs.length);
      extra.forEach((tx) =>
        unmatchedTransfers.push({
          tx,
          accountName: accountNameById.get(tx.accountId) || tx.accountId,
        })
      );
    }
  }

  const hasPendingWork =
    groupsToCreate.length > 0 ||
    duplicateCleanups.length > 0 ||
    devengoPairs.length > 0 ||
    financingSplits.length > 0 ||
    categoriesToClassifyCount > 0;

  return {
    groupsToCreate,
    duplicateCleanups,
    devengoPairs,
    financingSplits,
    categoriesToClassifyCount,
    unmatchedTransfers,
    hasPendingWork,
  };
};

const computeBalancesMap = (accounts: Account[], transactions: Transaction[]) => {
  const map = new Map<string, number>();
  for (const acc of accounts) {
    map.set(acc.id, calculateAccountBalance(acc, transactions, false));
  }
  return map;
};

export const executeMigrationPlan = async (): Promise<MigrationExecutionResult> => {
  // 0. Snapshot automático previo en la nube
  const beforeData = await getFullCloudData();
  const snapshot = await createSnapshotFromCloud();
  const beforeBalances = computeBalancesMap(beforeData.accounts, beforeData.transactions);

  const plan = buildMigrationPlan(beforeData);

  let groupsCreated = 0;
  let categoriesUpdated = 0;
  let duplicatesMerged = 0;
  let devengosNetted = 0;
  let financingTransactionsMoved = 0;

  // 1. Crear Grupos padre (Nivel 1)
  const groupIdByNorm = new Map<string, string>();
  beforeData.categories
    .filter((c) => Boolean(c.isGroup))
    .forEach((g) => groupIdByNorm.set(normalizeCategoryName(g.name), g.id));

  for (const g of plan.groupsToCreate) {
    const id = crypto.randomUUID();
    const { error } = await supabase.from("categories").insert([
      {
        id,
        name: g.name,
        icon: g.icon,
        color: g.color,
        parentId: null,
        isGroup: true,
        kind: g.kind,
        nature: g.nature,
        isArchived: false,
      },
    ]);
    if (error) {
      throw new Error(`Error creando grupo "${g.name}": ${error.message}`);
    }
    groupIdByNorm.set(normalizeCategoryName(g.name), id);
    groupsCreated++;
  }

  // 2. Asegurar existencia de subcategorías destino especiales (Préstamo recibido, Comisiones bancarias, Devolución Préstamo)
  const ensureSubcategory = async (
    name: string,
    groupName: string,
    kind: CategoryKind,
    nature: CategoryNature | null,
    icon = "Tag",
    color = "#6366f1",
    isArchived = false
  ) => {
    const { data: existingList } = await supabase.from("categories").select("*");
    const allCats = (existingList as Category[]) || [];
    const match = allCats.find(
      (c) => !c.isGroup && normalizeCategoryName(c.name) === normalizeCategoryName(name)
    );
    const parentId = groupIdByNorm.get(normalizeCategoryName(groupName)) ?? null;
    if (match) {
      await supabase
        .from("categories")
        .update({
          name: name.trim(),
          parentId,
          isGroup: false,
          kind,
          nature,
          isArchived,
        })
        .eq("id", match.id);
      return match.id;
    }
    const newId = crypto.randomUUID();
    const { error } = await supabase.from("categories").insert([
      {
        id: newId,
        name: name.trim(),
        icon,
        color,
        parentId,
        isGroup: false,
        kind,
        nature,
        isArchived,
      },
    ]);
    if (error) throw new Error(`Error creando subcategoría "${name}": ${error.message}`);
    return newId;
  };

  if (plan.financingSplits.some((s) => s.targetCategory === "Préstamo recibido")) {
    await ensureSubcategory("Préstamo recibido", "Financiación", "financing", null, "CreditCard", "#6366f1");
  }
  if (plan.financingSplits.some((s) => s.targetCategory === "Devolución Préstamo")) {
    await ensureSubcategory("Devolución Préstamo", "Financiero y Extraordinarios", "expense", "debt", "CreditCard", "#7c3aed");
  }
  if (plan.duplicateCleanups.some((d) => d.targetName === "Comisiones bancarias")) {
    await ensureSubcategory("Comisiones bancarias", "Financiero y Extraordinarios", "expense", "debt", "Landmark", "#7c3aed");
  }

  // 3. Ejecutar splits de Financiación / Préstamos en transacciones
  for (const split of plan.financingSplits) {
    const { error } = await supabase
      .from("transactions")
      .update({ category: split.targetCategory })
      .eq("id", split.tx.id);
    if (error) throw new Error(`Error reclasificando transacción de préstamo: ${error.message}`);
    financingTransactionsMoved++;
  }

  // 4. Netear Devengos nomina contra nómina Salvador (Opción A)
  for (const pair of plan.devengoPairs) {
    const newDesc = pair.incomeTx.description?.trim()
      ? pair.incomeTx.description
      : `Neto ajustado (${pair.incomeTx.amount.toFixed(2)}€ - ${pair.devengoTx.amount.toFixed(2)}€ devengos)`;

    const { error: upErr } = await supabase
      .from("transactions")
      .update({
        amount: pair.newIncomeAmount,
        description: newDesc,
      })
      .eq("id", pair.incomeTx.id);
    if (upErr) throw new Error(`Error ajustando nómina neta (${pair.month}): ${upErr.message}`);

    const { error: delErr } = await supabase
      .from("transactions")
      .delete()
      .eq("id", pair.devengoTx.id);
    if (delErr) throw new Error(`Error eliminando devengo (${pair.month}): ${delErr.message}`);
    devengosNetted++;
  }

  // 5. Limpiar y fusionar duplicados (espacios / Gastos bancarios ? / etc.) en todas las tablas
  const tablesWithCategory = [
    "transactions",
    "budgets",
    "favorites",
    "savings_goals",
    "recurring_rules",
  ] as const;

  for (const dup of plan.duplicateCleanups) {
    if (dup.rawNames.length === 0) continue;

    // Presupuestos: combinar si hay colisión en el mismo mes
    const { data: dupBudgets } = await supabase
      .from("budgets")
      .select("*")
      .in("category", [...dup.rawNames, dup.targetName]);
    if (dupBudgets && dupBudgets.length > 0) {
      const targetByMonth = new Map<string, any>();
      const sourceList: any[] = [];
      for (const b of dupBudgets) {
        if (b.category === dup.targetName) targetByMonth.set(b.month, b);
        else sourceList.push(b);
      }
      for (const sb of sourceList) {
        const existing = targetByMonth.get(sb.month);
        if (existing) {
          await supabase
            .from("budgets")
            .update({ amount: Number((Number(existing.amount) + Number(sb.amount)).toFixed(2)) })
            .eq("id", existing.id);
          await supabase.from("budgets").delete().eq("id", sb.id);
        } else {
          await supabase.from("budgets").update({ category: dup.targetName }).eq("id", sb.id);
          targetByMonth.set(sb.month, { ...sb, category: dup.targetName });
        }
      }
    }

    for (const tbl of tablesWithCategory) {
      if (tbl === "budgets") continue;
      await supabase.from(tbl).update({ category: dup.targetName }).in("category", dup.rawNames);
    }

    duplicatesMerged += dup.rawNames.length;
  }

  // 6. Clasificar y deduplicar filas en la tabla `categories`
  const { data: currentCatsRaw } = await supabase.from("categories").select("*");
  const currentCats = (currentCatsRaw as Category[]) || [];
  const seenCanonicalCatNorms = new Set<string>();

  for (const cat of currentCats) {
    if (cat.isGroup) continue;
    const norm = normalizeCategoryName(cat.name);

    // Eliminar categorías obsoletas si ya no tienen transacciones (Devengos nomina, Prestamo Tarjeta, Ingresos)
    if (["devengos nomina", "prestamo tarjeta", "ingresos"].includes(norm)) {
      const { data: remaining } = await supabase
        .from("transactions")
        .select("id")
        .eq("category", cat.name)
        .limit(1);
      if (!remaining || remaining.length === 0) {
        await supabase.from("categories").delete().eq("id", cat.id);
        continue;
      }
    }

    const rule = findRuleForName(cat.name);
    const canonicalName = rule?.canonicalName || cat.name.trim();
    const canonicalNorm = normalizeCategoryName(canonicalName);

    // Si ya existe otra fila en `categories` para el mismo nombre canónico, borrar el duplicado
    if (seenCanonicalCatNorms.has(canonicalNorm)) {
      await supabase.from("categories").delete().eq("id", cat.id);
      continue;
    }
    seenCanonicalCatNorms.add(canonicalNorm);

    if (rule) {
      const parentId = groupIdByNorm.get(normalizeCategoryName(rule.groupName)) ?? null;
      const { error: updErr } = await supabase
        .from("categories")
        .update({
          name: canonicalName,
          parentId,
          isGroup: false,
          kind: rule.kind,
          nature: rule.nature,
          isArchived: Boolean(rule.isArchived),
        })
        .eq("id", cat.id);
      if (!updErr) categoriesUpdated++;
    } else if (cat.name !== cat.name.trim()) {
      await supabase.from("categories").update({ name: cat.name.trim() }).eq("id", cat.id);
      categoriesUpdated++;
    }
  }

  // 7. Verificar invariante contable: saldo por cuenta ANTES vs DESPUÉS === 0.00€
  const afterData = await getFullCloudData();
  const afterBalances = computeBalancesMap(afterData.accounts, afterData.transactions);

  const balanceChecks: AccountBalanceCheck[] = afterData.accounts.map((acc) => {
    const before = beforeBalances.get(acc.id) ?? 0;
    const after = afterBalances.get(acc.id) ?? 0;
    const diff = Number((after - before).toFixed(2));
    return {
      accountId: acc.id,
      accountName: acc.name,
      before,
      after,
      diff,
    };
  });

  const allBalancesMatch = balanceChecks.every((c) => Math.abs(c.diff) < 0.005);

  return {
    snapshotId: snapshot.id,
    groupsCreated,
    categoriesUpdated,
    duplicatesMerged,
    devengosNetted,
    financingTransactionsMoved,
    balanceChecks,
    allBalancesMatch,
  };
};
