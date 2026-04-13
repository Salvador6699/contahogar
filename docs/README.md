# 📘 Documentación Completa — ContaHogar v2.0

> Aplicación de gestión financiera personal construida con **React + TypeScript + Vite + TailwindCSS + shadcn/ui**.
> Todos los datos se almacenan localmente en `localStorage`. No hay backend ni servidor.

---

## 📑 Índice

1. [Visión General del Proyecto](#visión-general-del-proyecto)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estructura de Carpetas](#estructura-de-carpetas)
4. [Tipos de Datos (Types)](#tipos-de-datos-types)
5. [Módulos de Lógica (lib/)](#módulos-de-lógica-lib)
6. [Hooks Personalizados (hooks/)](#hooks-personalizados-hooks)
7. [Componentes (components/)](#componentes-components)
8. [Páginas (pages/)](#páginas-pages)
9. [Punto de Entrada y Configuración](#punto-de-entrada-y-configuración)
10. [Flujos Principales](#flujos-principales)

---

## Visión General del Proyecto

**ContaHogar** es una aplicación de finanzas personales "mobile-first" que permite:

- Registrar **ingresos y gastos** asociados a múltiples **cuentas** (banco, efectivo, etc.).
- Crear **transacciones recurrentes** (gastos fijos) que se proyectan automáticamente al futuro.
- **Transferir** dinero entre cuentas.
- Establecer **presupuestos mensuales** por categoría.
- Visualizar **medias mensuales** de gasto/ingreso por categoría.
- **Cuadrar saldos** comparando el saldo de la app con el saldo real de cada cuenta.
- **Exportar/importar** datos en formato JSON como backup.
- Personalizar **categorías** con iconos, colores e imágenes personalizadas.
- Cambiar tema (claro/oscuro/sistema).

---

## Stack Tecnológico

| Tecnología | Uso |
|---|---|
| **React 18** | Framework UI |
| **TypeScript** | Tipado estático |
| **Vite 5** | Bundler y dev server |
| **TailwindCSS 3** | Estilos utility-first |
| **shadcn/ui** | Componentes UI (Radix + Tailwind) |
| **Recharts** | Gráficos (pie charts, bar charts) |
| **React Router DOM 6** | Enrutamiento SPA |
| **date-fns** | Manipulación de fechas |
| **uuid** | Generación de IDs únicos |
| **Sonner** | Notificaciones toast |
| **next-themes** | Gestión de tema claro/oscuro |
| **Lucide React** | Biblioteca de iconos |
| **Vaul** | Drawers para móvil |
| **localStorage** | Persistencia de datos (no hay backend) |

---

## Estructura de Carpetas

```
ContaHogar/
├── public/                  # Assets estáticos (bienvenida.png, iconos)
├── src/
│   ├── types/
│   │   └── finance.ts       # Interfaces y tipos de datos
│   ├── lib/
│   │   ├── storage.ts       # CRUD completo con localStorage
│   │   ├── calculations.ts  # Cálculos financieros (saldos, medias)
│   │   ├── automation.ts    # Motor de transacciones recurrentes
│   │   ├── budgetStorage.ts # CRUD de presupuestos
│   │   └── utils.ts         # Utilidades (cn, withKeyboardClose)
│   ├── hooks/
│   │   ├── use-mobile.tsx    # Detección de dispositivo móvil
│   │   ├── use-toast.ts     # Sistema de notificaciones
│   │   ├── useMonthFilter.ts # Filtrado de transacciones por mes
│   │   └── useScrollOnFocus.ts # Scroll automático al enfocar inputs
│   ├── components/
│   │   ├── ui/              # Componentes base shadcn/ui
│   │   ├── AccountManager.tsx
│   │   ├── AccountSelector.tsx
│   │   ├── BalanceCard.tsx
│   │   ├── BalanceComparisonModal.tsx
│   │   ├── CategoryAveragesModal.tsx
│   │   ├── CategoryBreakdown.tsx
│   │   ├── DashboardCharts.tsx
│   │   ├── DataManagementModal.tsx
│   │   ├── FloatingButtons.tsx
│   │   ├── MobileNav.tsx
│   │   ├── MonthlySummaryModal.tsx
│   │   ├── NavLink.tsx
│   │   ├── ScrollToTop.tsx
│   │   ├── SplashScreen.tsx
│   │   ├── SummaryCards.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── TransactionList.tsx
│   │   ├── TransactionModal.tsx
│   │   └── TransferModal.tsx
│   ├── pages/
│   │   ├── Index.tsx          # Dashboard principal
│   │   ├── BudgetPage.tsx     # Presupuestos mensuales
│   │   ├── HistoryPage.tsx    # Historial de meses
│   │   ├── ComparisonPage.tsx # Cuadrar saldos
│   │   ├── AveragesPage.tsx   # Medias por categoría
│   │   ├── TransferPage.tsx   # Transferencias entre cuentas
│   │   ├── ManagementPage.tsx # Gestión de categorías y automatizaciones
│   │   ├── SettingsPage.tsx   # Ajustes (tema, cuentas)
│   │   ├── BackupPage.tsx     # Seguridad y copias de seguridad
│   │   ├── GuidePage.tsx      # Guía de uso de la app
│   │   └── NotFound.tsx       # Página 404
│   ├── App.tsx               # Componente raíz con rutas
│   ├── main.tsx              # Punto de entrada React
│   ├── index.css             # Estilos globales
│   └── App.css               # Estilos de App
├── index.html
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

---

## Tipos de Datos (Types)

> **Archivo:** `src/types/finance.ts`

### `TransactionType`
```typescript
type TransactionType = 'income' | 'expense';
```
Define si un movimiento es un ingreso o un gasto.

### `RecurrenceFrequency`
```typescript
type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'every_n_months' | 'yearly';
```
Frecuencias posibles para transacciones recurrentes.

### `Account`
```typescript
interface Account {
  id: string;           // UUID único
  name: string;         // Nombre de la cuenta (ej: "Banco", "Efectivo")
  initialBalance: number; // Saldo inicial configurado por el usuario
}
```
Representa una cuenta financiera. El saldo actual se calcula sumando el saldo inicial + todas las transacciones asociadas.

### `Transaction`
```typescript
interface Transaction {
  id: string;            // UUID o ID auto-generado (auto-XXXXX para recurrentes)
  date: string;          // Formato "yyyy-MM-dd"
  amount: number;        // Importe en euros (siempre positivo)
  category: string;      // Nombre de la categoría
  type: TransactionType; // 'income' | 'expense'
  accountId: string;     // ID de la cuenta asociada
  description?: string;  // Descripción opcional (ej: "Automático: Alquiler")
  isPending?: boolean;   // true = transacción futura/prevista, false/undefined = real
}
```
Unidad fundamental de la app. Una transacción pendiente (`isPending: true`) no afecta al saldo actual pero sí al saldo previsto.

### `Category`
```typescript
interface Category {
  id: string;
  name: string;
  icon?: string;         // Nombre del icono de Lucide (ej: "Wallet", "Car")
  color?: string;        // Color hex (ej: "#10b981")
  monthlyLimit?: number; // Límite mensual opcional
  customIcon?: string;   // Data URL de imagen subida por el usuario
}
```
Categoría personalizable con icono y color.

### `RecurringTransaction`
```typescript
interface RecurringTransaction {
  id: string;
  name: string;                    // Nombre descriptivo (ej: "Alquiler")
  amount: number;
  type: TransactionType;
  category: string;
  accountId: string;
  frequency: RecurrenceFrequency;
  intervalMonths?: number;         // Solo para 'every_n_months' (cada N meses)
  endAfterMonths?: number;         // undefined = indefinido; N = termina tras N meses
  startDate: string;               // "yyyy-MM-dd"
  lastGeneratedDate?: string;
  isActive: boolean;               // Se puede pausar/reanudar
}
```
Plantilla que genera transacciones pendientes automáticamente hasta 1 año en el futuro.

### `CategorySummary`
```typescript
interface CategorySummary {
  category: string;
  total: number;   // Suma total de esa categoría
  count: number;   // Nº de transacciones
}
```
Resultado de agrupar transacciones por categoría.

### `Budget`
```typescript
interface Budget {
  id: string;
  category: string;
  amount: number;   // Presupuesto asignado
  month: string;    // "yyyy-MM" — el mes al que pertenece
}
```
Presupuesto mensual para una categoría específica.

### `FinanceData`
```typescript
interface FinanceData {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  recurringTransactions?: RecurringTransaction[];
}
```
Estructura completa que se persiste en `localStorage` bajo la clave `finance_app_data`.

---

## Módulos de Lógica (lib/)

### `storage.ts` — Persistencia y CRUD

> **Clave localStorage:** `finance_app_data`

#### Funciones de datos generales

| Función | Descripción | Parámetros | Retorno |
|---|---|---|---|
| `getDefaultData()` | Genera datos por defecto con 2 cuentas (Banco, Efectivo) y 5 categorías | — | `FinanceData` |
| `migrateData(data)` | Migra datos de formatos antiguos al nuevo (multi-cuenta, categorías estructuradas) | `data: any` | `FinanceData` |
| `loadData()` | Carga datos de localStorage, los migra si es necesario, y crea datos por defecto si no existen | — | `FinanceData` |
| `saveData(data)` | Guarda la estructura completa en localStorage | `data: FinanceData` | `void` |

#### CRUD de Cuentas

| Función | Descripción | Parámetros | Retorno |
|---|---|---|---|
| `addAccount(name, initialBalance)` | Crea una cuenta nueva con UUID | `name: string, initialBalance: number` | `Account` |
| `updateAccount(updatedAccount)` | Actualiza nombre y/o saldo inicial | `updatedAccount: Account` | `void` |
| `deleteAccount(accountId)` | Elimina una cuenta. Falla si es la última o tiene transacciones | `accountId: string` | `{ success, message? }` |

#### CRUD de Transacciones

| Función | Descripción | Parámetros | Retorno |
|---|---|---|---|
| `addTransaction(transaction)` | Crea transacción con UUID auto-generado | `Omit<Transaction, 'id'>` | `void` |
| `saveTransactionWithId(transaction)` | Guarda transacción preservando su ID (para recurrentes) | `Transaction` | `void` |
| `updateTransaction(updatedTransaction)` | Actualiza una transacción existente por ID | `Transaction` | `void` |
| `deleteTransaction(transactionId)` | Elimina una transacción por ID | `string` | `void` |

#### CRUD de Categorías

| Función | Descripción | Parámetros | Retorno |
|---|---|---|---|
| `getCategories()` | Devuelve todas las categorías | — | `Category[]` |
| `addCategory(categoryName)` | Añade categoría si no existe (normalizada para evitar duplicados) | `string` | `void` |
| `updateCategory(updated)` | Actualiza nombre, color, icono de una categoría | `Category` | `void` |
| `deleteCategory(id)` | Elimina categoría. Falla si tiene transacciones asociadas | `string` | `{ success, message? }` |

#### CRUD de Transacciones Recurrentes

| Función | Descripción | Parámetros | Retorno |
|---|---|---|---|
| `addRecurringTransaction(recurring)` | Crea una automatización nueva | `Omit<RecurringTransaction, 'id'>` | `void` |
| `updateRecurringTransaction(updated)` | Actualiza una automatización | `RecurringTransaction` | `void` |
| `deleteRecurringTransaction(id)` | Elimina una automatización | `string` | `void` |
| `loadRecurringTransactions()` | Carga todas las automatizaciones | — | `RecurringTransaction[]` |

#### Funciones de búsqueda de categorías

| Función | Descripción | Parámetros | Retorno |
|---|---|---|---|
| `normalizeCategory(category)` | Normaliza texto: minúsculas, sin acentos | `string` | `string` |
| `findSimilarCategory(input, categories)` | Busca categoría existente que coincida (normalizada) | `string, (string\|Category)[]` | `string \| null` |
| `getCategorySuggestions(input, categories)` | Filtra categorías que contengan el texto (para autocompletado) | `string, (string\|Category)[]` | `string[]` |

---

### `calculations.ts` — Cálculos Financieros

| Función | Descripción | Parámetros | Retorno |
|---|---|---|---|
| `calculateBalance(transactions, accountId?, includePending?, upToEndOfMonth?)` | Calcula el balance neto de transacciones (ingresos - gastos). Opcionalmente filtra por cuenta, incluye pendientes, y limita hasta fin de mes | `Transaction[], string?, boolean, string?` | `number` |
| `calculateAccountBalance(account, transactions, includePending?, upToEndOfMonth?)` | Saldo de una cuenta = saldo inicial + balance de sus transacciones | `Account, Transaction[], boolean?, string?` | `number` |
| `calculateTotalBalance(accounts, transactions, includePending?, upToEndOfMonth?)` | Suma los saldos de todas las cuentas | `Account[], Transaction[], boolean?, string?` | `number` |
| `calculateTotalIncome(transactions, accountId?, includePending?)` | Suma total de ingresos, opcionalmente filtrado por cuenta y pendientes | `Transaction[], string?, boolean` | `number` |
| `calculateTotalExpenses(transactions, accountId?, includePending?)` | Suma total de gastos | `Transaction[], string?, boolean` | `number` |
| `calculateCategorySummaries(transactions, type, accountId?, onlyPending?)` | Agrupa transacciones por categoría y devuelve totales ordenados de mayor a menor | `Transaction[], 'income'\|'expense', string?, boolean` | `CategorySummary[]` |
| `formatCurrency(amount)` | Formatea un número como moneda EUR (ej: "1.234,56 €") | `number` | `string` |
| `calculateMonthlyAverages(transactions)` | Calcula la media mensual de cada categoría (total / nº de meses con actividad). Excluye transferencias. Marca como "regular" si tiene actividad en ≥3 meses | `Transaction[]` | `CategoryMonthlyAverage[]` |

#### Interfaz `CategoryMonthlyAverage`
```typescript
interface CategoryMonthlyAverage {
  category: string;
  average: number;            // Media mensual redondeada
  totalAmount: number;        // Suma total histórica
  transactionCount: number;   // Nº total de transacciones
  monthsCount: number;        // Meses con actividad
  isRegular: boolean;         // true si monthsCount >= 3
  type: 'income' | 'expense';
  lastDate?: string;          // Fecha de la última transacción
}
```

---

### `automation.ts` — Motor de Transacciones Recurrentes

| Función | Descripción | Parámetros | Retorno |
|---|---|---|---|
| `processRecurringTransactions()` | Genera transacciones futuras (pendientes) para todas las automatizaciones activas. Proyecta hasta 1 año en el futuro. Cada transacción auto-generada tiene ID `auto-{templateId}-{date}` para evitar duplicados | — | `{ created: number, current: number }` |
| `getNextDate(date, frequency, intervalMonths?)` | Calcula la siguiente fecha según la frecuencia | `Date, RecurrenceFrequency, number?` | `Date` |

**Lógica clave:**
- Se ejecuta automáticamente al iniciar la app (`App.tsx → useEffect`).
- Para cada plantilla activa, genera transacciones con `isPending: true` desde `startDate + 1 periodo` hasta `startDate + endAfterMonths` o 1 año.
- Si la transacción con ese ID ya existe, no la duplica.
- El usuario puede "confirmar" una transacción pendiente (ponerla como real `isPending: false`).

---

### `budgetStorage.ts` — CRUD de Presupuestos

| Función | Descripción | Parámetros | Retorno |
|---|---|---|---|
| `loadBudgets(month)` | Carga presupuestos filtrados por mes ("yyyy-MM") | `string` | `Budget[]` |
| `saveBudget(budget)` | Guarda un presupuesto nuevo | `Budget` | `void` |
| `updateBudget(updated)` | Actualiza un presupuesto existente | `Budget` | `void` |
| `deleteBudget(id)` | Elimina un presupuesto | `string` | `void` |

---

### `utils.ts` — Utilidades Generales

| Función | Descripción | Parámetros | Retorno |
|---|---|---|---|
| `cn(...inputs)` | Combina clases CSS con `clsx` + `tailwind-merge` (evita conflictos de Tailwind) | `ClassValue[]` | `string` |
| `withKeyboardClose(action)` | Envuelve una acción para cerrar el teclado virtual del móvil antes de ejecutarla. Incluye debounce de 400ms para evitar doble ejecución entre `onPointerDown` y `onClick`. Si hay un input enfocado, hace `blur()` y espera 150ms antes de ejecutar la acción | `() => void` | `void` |

---

## Hooks Personalizados (hooks/)

### `useIsMobile()` — `use-mobile.tsx`

**Propósito:** Detecta si el dispositivo es móvil (ancho < 768px).

| Propiedad | Tipo | Descripción |
|---|---|---|
| Retorno | `boolean` | `true` si el viewport < 768px |

**Implementación:** Usa `window.matchMedia` con listener de cambios.

---

### `useToast()` — `use-toast.ts`

**Propósito:** Sistema de notificaciones toast personalizado (usado por shadcn/ui Toaster).

| Propiedad | Tipo | Descripción |
|---|---|---|
| `toasts` | `ToasterToast[]` | Lista de toasts activos |
| `toast(props)` | `function` | Crea una notificación |
| `dismiss(toastId?)` | `function` | Cierra un toast |

**Uso:** Limitado a 1 toast visible (`TOAST_LIMIT = 1`). Usa patrón pub/sub global.

---

### `useMonthFilter(transactions, selectedMonth)` — `useMonthFilter.ts`

**Propósito:** Filtra transacciones por mes y proporciona utilidades de navegación mensual.

| Parámetro | Tipo | Descripción |
|---|---|---|
| `transactions` | `Transaction[]` | Todas las transacciones |
| `selectedMonth` | `string \| null` | "yyyy-MM" o null para mes actual |

| Retorno | Tipo | Descripción |
|---|---|---|
| `filteredTransactions` | `Transaction[]` | Transacciones del mes seleccionado |
| `isCurrentMonth` | `boolean` | ¿Es el mes actual? |
| `currentMonthKey` | `string` | "yyyy-MM" del mes actual |
| `selectedMonthLabel` | `string` | Nombre largo del mes (ej: "abril 2026") |

---

### `useScrollOnFocus(extraPaddingPx?)` — `useScrollOnFocus.ts`

**Propósito:** Al enfocar un input en móvil, hace scroll automático para que el input quede visible por encima del teclado virtual.

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `extraPaddingPx` | `number` | `240` | Espacio adicional bajo el input (para las sugerencias) |

| Retorno | Tipo | Descripción |
|---|---|---|
| `handleFocus` | `(e: FocusEvent) => void` | Handler para el evento `onFocus` del input |

**Implementación:**
1. `scrollIntoView({ block: 'center' })` para Android.
2. Tras 350ms (tiempo de apertura del teclado), recalcula con `visualViewport` para iOS Safari.

---

## Componentes (components/)

### `AccountManager`
**Archivo:** `AccountManager.tsx`  
**Tipo:** Componente standalone (sin props)  
**Usado en:** `SettingsPage`

**Descripción:** Panel CRUD para gestionar cuentas financieras (Banco, Efectivo, etc.).

**Funcionalidad:**
- Lista todas las cuentas con nombre y saldo inicial
- Botón "Añadir Nueva Cuenta" abre diálogo con nombre + saldo inicial
- Editar cuenta: same diálogo pre-rellenado
- Eliminar cuenta: validación (no la última, no tiene transacciones)

**Estado interno:**
- `accounts`: lista de cuentas cargadas
- `isDialogOpen`, `editingAccount`: control del diálogo
- `accountName`, `initialBalance`: campos del formulario

**Dependencias:** `loadData`, `addAccount`, `updateAccount`, `deleteAccount`, `formatCurrency`

---

### `AccountSelector`
**Archivo:** `AccountSelector.tsx`  
**Props:**

| Prop | Tipo | Descripción |
|---|---|---|
| `selectedAccount` | `string \| 'total'` | ID de cuenta seleccionada o 'total' |
| `onSelectAccount` | `(account: string \| 'total') => void` | Callback al seleccionar |
| `accounts` | `Account[]` | Lista de cuentas |
| `accountBalances` | `Array<{ account, balance, projectedBalance }>` | Saldos calculados |

**Descripción:** Fila de botones para filtrar el dashboard por cuenta. Incluye botón "Total" que muestra la suma de todas las cuentas.

---

### `BalanceCard`
**Archivo:** `BalanceCard.tsx`  
**Props:**

| Prop | Tipo | Descripción |
|---|---|---|
| `balance` | `number` | Saldo actual (sin pendientes) |
| `projectedBalance` | `number` | Saldo previsto (con pendientes) |

**Descripción:** Tarjeta premium con gradiente que muestra el saldo actual grande y, si hay transacciones pendientes, el saldo previsto debajo. Cambia icono según positivo/negativo.

---

### `BalanceComparisonModal`
**Archivo:** `BalanceComparisonModal.tsx`  
**Props:**

| Prop | Tipo | Descripción |
|---|---|---|
| `isOpen` | `boolean` | Controla visibilidad del modal |
| `onClose` | `() => void` | Callback al cerrar |
| `categories` | `string[]` | Lista de nombres de categorías |
| `onSaveAdjustments` | `(transactions: Omit<Transaction, 'id'>[]) => void` | Callback al guardar ajustes |

**Descripción:** Modal para cuadrar saldos. El usuario introduce su saldo real por cuenta y añade ajustes (ingresos/gastos olvidados) hasta que coincida con el saldo de la app.

---

### `CategoryAveragesModal`
**Archivo:** `CategoryAveragesModal.tsx`  
**Props:**

| Prop | Tipo | Descripción |
|---|---|---|
| `isOpen` | `boolean` | Controla visibilidad |
| `onClose` | `() => void` | Callback al cerrar |
| `transactions` | `Transaction[]` | Transacciones para calcular medias |

**Descripción:** Modal con gráficos de barras horizontales que muestran la media mensual de gasto e ingreso por categoría. Excluye transacciones pendientes.

---

### `CategoryBreakdown`
**Archivo:** `CategoryBreakdown.tsx`  
**Props:**

| Prop | Tipo | Descripción |
|---|---|---|
| `categories` | `CategorySummary[]` | Resúmenes por categoría |
| `type` | `'income' \| 'expense'` | Tipo de movimiento |
| `isPending` | `boolean` | `true` para mostrar futuras, `false` para actuales |
| `transactions` | `Transaction[]` | Transacciones (para el modo pending individual) |
| `onEditTransaction` | `(t: Transaction) => void` | Callback editar (solo pending) |
| `onDeleteTransaction` | `(id: string) => void` | Callback eliminar (solo pending) |
| `onConfirmTransaction` | `(t: Transaction) => void` | Callback confirmar (pasar de pendiente a real) |
| `budgets` | `Budget[]` | Presupuestos (para mostrar restante) |
| `categoryCatalog` | `Category[]` | Catálogo de categorías (iconos/colores) |

**Descripción:** Componente dual:
- **Modo `isPending=true`:** Lista individual de transacciones futuras ordenadas por fecha. Cada una con botón de confirmar, editar y eliminar.
- **Modo `isPending=false`:** Agrupa por categoría con total, nº transacciones, icono/color, y si hay presupuesto muestra cuánto resta.

**Paginación:** 5 items por página con navegación.

---

### `DashboardCharts`
**Archivo:** `DashboardCharts.tsx`  
**Props:**

| Prop | Tipo | Descripción |
|---|---|---|
| `expenseCategories` | `CategorySummary[]` | Gastos agrupados |
| `totalIncome` | `number` | Ingresos totales |
| `totalExpenses` | `number` | Gastos totales |
| `selectedAccount` | `string` | Cuenta seleccionada |
| `accounts` | `Account[]` | Lista de cuentas |
| `categoryCatalog` | `Category[]` | Catálogo de categorías |

**Descripción:** Gráfico de tarta (donut) con los Top N gastos por categoría. Usa colores del catálogo de categorías. Selector para ver Top 5, 10, 15 o Todos. Leyenda scrolleable al lado.

---

### `DataManagementModal`
**Archivo:** `DataManagementModal.tsx`  
**Props:**

| Prop | Tipo | Descripción |
|---|---|---|
| `isOpen` | `boolean` | Controla visibilidad |
| `onClose` | `() => void` | Callback al cerrar |
| `onDataImported` | `() => void` | Callback tras importar datos |

**Descripción:** Modal con funciones de exportar (descargar JSON) e importar (seleccionar archivo JSON) datos. Al importar ejecuta `migrateData()` y valida la estructura.

---

### `FloatingButtons`
**Archivo:** `FloatingButtons.tsx`  
**Props:**

| Prop | Tipo | Descripción |
|---|---|---|
| `onAddIncome` | `() => void` | Callback al elegir "Ingreso" |
| `onAddExpense` | `() => void` | Callback al elegir "Gasto" |

**Descripción:** Botón flotante circular (FAB) en la esquina inferior derecha. Al tocarlo, abre un diálogo para elegir entre "Gasto" o "Ingreso". Usa `withKeyboardClose` para compatibilidad móvil.

---

### `MobileNav`
**Archivo:** `MobileNav.tsx`  
**Tipo:** Componente standalone (sin props)

**Descripción:** Sistema de navegación completo con 3 variantes:
1. **Cabecera fija superior:** Muestra el nombre de la página actual con icono + botón menú hamburguesa que abre Sheet lateral con navegación completa.
2. **Barra inferior móvil:** 5 botones (Inicio, Cuadrar, Transf., Gasto directo, Ingreso directo). Solo visible en `< lg`.
3. **Sidebar escritorio:** Barra lateral izquierda fija con iconos. Solo visible en `>= lg`.

**Items de navegación:**
- **Barra inferior:** Inicio `/`, Cuadrar `/comparativa`, Transferir `/transferir`, Gasto rápido, Ingreso rápido
- **Sheet lateral:** Historial, Medias, Gestión, Presupuestos, Ajustes, Seguridad, Guía

---

### `MonthlySummaryModal`
**Archivo:** `MonthlySummaryModal.tsx`  
**Props:**

| Prop | Tipo | Descripción |
|---|---|---|
| `isOpen` | `boolean` | Controla visibilidad |
| `onClose` | `() => void` | Callback al cerrar |
| `transactions` | `Transaction[]` | Transacciones a agrupar por mes |
| `onSelectMonth` | `(month: string) => void` | Callback al seleccionar un mes |

**Descripción:** Modal con gráfico de barras agrupadas (ingresos vs gastos) por mes + lista de meses clicables. Al tocar una barra/mes, navega al dashboard de ese mes. Excluye transferencias y pendientes.

---

### `NavLink`
**Archivo:** `NavLink.tsx`

**Descripción:** Wrapper sobre `NavLink` de React Router que acepta `className` string + `activeClassName` en vez de la función de React Router. Usado como utilidad de navegación.

---

### `ScrollToTop`
**Archivo:** `ScrollToTop.tsx`  
**Tipo:** Componente invisible (no renderiza)

**Descripción:** Al cambiar de ruta, resetea scroll a arriba y cierra el teclado virtual (haciendo blur al elemento activo). Renderiza `null`.

---

### `SplashScreen`
**Archivo:** `SplashScreen.tsx`  
**Props:**

| Prop | Tipo | Descripción |
|---|---|---|
| `onFinish` | `() => void` | Callback cuando termina el splash |

**Descripción:** Pantalla de bienvenida de 3 segundos con:
- Logo/imagen (`/bienvenida.png`)
- Consejos financieros rotativos (cambian cada 2s con fade)
- Barra de progreso animada
- Se puede saltar tocando

**Constantes:** `SPLASH_DURATION_MS = 3000`, `TIP_INTERVAL_MS = 2000`, 10 tips.

---

### `SummaryCards`
**Archivo:** `SummaryCards.tsx`  
**Props:**

| Prop | Tipo | Descripción |
|---|---|---|
| `totalIncome` | `number` | Total ingresos del periodo |
| `totalExpenses` | `number` | Total gastos del periodo |

**Descripción:** Dos tarjetas lado a lado: Ingresos (verde) y Gastos (naranja), cada una con icono y valor formateado.

---

### `ThemeToggle`
**Archivo:** `ThemeToggle.tsx`  
**Tipo:** Componente standalone (sin props)

**Descripción:** Botón que alterna entre modo claro y oscuro usando `next-themes`. Muestra icono Sol/Luna según tema actual.

---

### `TransactionList`
**Archivo:** `TransactionList.tsx`  
**Props:**

| Prop | Tipo | Descripción |
|---|---|---|
| `transactions` | `Transaction[]` | Transacciones a mostrar |
| `onEdit` | `(t: Transaction) => void` | Callback editar |
| `onDelete` | `(id: string) => void` | Callback eliminar |

**Descripción:** Lista paginada de transacciones (5 por página) con:
- **Búsqueda** por categoría, importe, fecha y tipo
- Tarjetas coloreadas (verde ingresos, naranja gastos)
- Badge "Futura" para transacciones pendientes
- Botones Editar y Eliminar en cada card
- Confirmación de eliminación con `AlertDialog`
- Paginación numérica

---

### `TransactionModal`
**Archivo:** `TransactionModal.tsx`  
**Props:**

| Prop | Tipo | Descripción |
|---|---|---|
| `isOpen` | `boolean` | Controla visibilidad |
| `onClose` | `() => void` | Callback al cerrar |
| `onSave` | `(transaction, copyToNextMonth?, recurringOptions?) => void` | Callback al guardar |
| `type` | `TransactionType` | 'income' o 'expense' |
| `categories` | `(string \| Category)[]` | Categorías disponibles |
| `editingTransaction` | `Transaction \| null` | Transacción a editar (null = nueva) |

**Descripción:** Formulario completo para crear/editar transacciones:
- **Fecha** (date picker)
- **Cuenta** (selector)
- **Checkbox "transacción futura"** (`isPending`)
- **Checkbox "recurrente"** que despliega opciones: intervalo en meses + duración (indefinido o N meses)
- **Importe** (number input)
- **Categoría** con autocompletado tipo "chips" (bubbles clicables)

**Modo edición:** Pre-rellena todos los campos con los datos de la transacción existente.

---

### `TransferModal`
**Archivo:** `TransferModal.tsx`  
**Props:**

| Prop | Tipo | Descripción |
|---|---|---|
| `isOpen` | `boolean` | Controla visibilidad |
| `onClose` | `() => void` | Callback al cerrar |
| `onTransfer` | `(amount, fromId, toId) => void` | Callback al transferir |
| `transferTransactions` | `Transaction[]` | Historial de transferencias |
| `onEditTransfer` | `(t: Transaction) => void` | Callback editar |
| `onDeleteTransfer` | `(id: string) => void` | Callback eliminar |

**Descripción:** Modal para transferir dinero entre cuentas. Muestra saldos actuales, botón para intercambiar cuentas, y historial de transferencias pasadas con edición/eliminación por pares (gasto + ingreso).

---

## Páginas (pages/)

### `Index` — Dashboard Principal
**Ruta:** `/`

**Descripción:** Página principal del dashboard con:
1. **Navegador de meses** (flecha izquierda - Mes actual - flecha derecha) con botón "Hoy"
2. **Selector de cuenta** (Total, Banco, Efectivo...)
3. **BalanceCard** (saldo actual + previsto)
4. **SummaryCards** (ingresos + gastos del mes)
5. **DashboardCharts** (gráfico de tarta de gastos)
6. **CategoryBreakdown pendientes**: Gastos futuros e ingresos futuros (con confirmar)
7. **CategoryBreakdown reales**: Gastos e ingresos por categoría del mes
8. **TransactionList**: Historial de transacciones reales

**Acciones rápidas:** Acepta query params `?action=add-expense` y `?action=add-income` para abrir el modal de transacción directamente (usado por MobileNav).

**Lógica principal `handleAddTransaction`:**
1. Si `recurringOptions` existe, crea `RecurringTransaction` + transacción real (no pending) + genera proyecciones.
2. Si editando, usa `updateTransaction`.
3. Si nuevo, usa `addTransaction`.
4. Si `copyToNextMonth`, crea copia pending para el mes siguiente.

---

### `BudgetPage` — Presupuestos
**Ruta:** `/presupuestos`

**Descripción:** Gestión de presupuestos mensuales:
- Navegador de meses
- Resumen: ingresos del mes, total presupuestado, disponible sin presupuestar
- Checkboxes para incluir ingresos/gastos previstos en los cálculos
- Formulario: categoría (con sugerencias chip) + presupuesto en euros (con sugerencia de media histórica)
- Lista de presupuestos: barra de progreso (gastado vs presupuestado), alerta si la liquidez real es menor que lo restante
- **Autocompletar con medias**: rellena automáticamente presupuestos basados en las categorías seleccionadas en AveragesPage

---

### `HistoryPage` — Historial
**Ruta:** `/historial`

**Descripción:** Vista de todos los meses registrados:
- Gráfico de barras comparativas (ingresos vs gastos) por mes
- Lista de meses clicable (al tocar, navega al dashboard de ese mes)
- Excluye transferencias y transacciones pendientes

---

### `ComparisonPage` — Cuadrar Saldos
**Ruta:** `/comparativa`

**Descripción:** Página de cuadre de saldos (versión página completa):
- Tabs por cuenta (Banco, Efectivo...)
- Muestra saldo de la app vs saldo ajustado
- Input para introducir saldo real
- Indicador de diferencia (faltan ingresos o gastos)
- Formulario para añadir ajustes (categoría + importe como ingreso o gasto)
- Lista de ajustes pendientes
- Al guardar, crea las transacciones de ajuste y navega al dashboard

---

### `AveragesPage` — Medias
**Ruta:** `/medias`

**Descripción:** Análisis de medias mensuales:
- Tarjeta resumen: "Balance Medio Estimado" (ingresos - gastos seleccionados)
- Gráficos de barras horizontales con checkboxes por categoría
- Seleccionar/deseleccionar categorías actualiza los totales en tiempo real
- Las selecciones se guardan en `localStorage` (`contahogar_selected_averages`) y se reutilizan en BudgetPage para el autocompletado

---

### `TransferPage` — Transferencias
**Ruta:** `/transferir`

**Descripción:** Página de transferencias entre cuentas:
- Selector de cuenta origen y destino con saldos visibles
- Botón para intercambiar origen/destino
- Input de importe con validación (no exceder saldo disponible)
- Al transferir: crea 2 transacciones (expense + income) con categoría "Transferencia"
- Historial de transferencias recientes con edición y eliminación

---

### `ManagementPage` — Gestión
**Ruta:** `/gestion`

**Descripción:** Centro de gestión con 2 secciones:

**1. Categorías:**
- Lista de categorías con icono, color y nombre
- Diálogo para crear/editar: nombre, subir foto personalizada o elegir icono de Lucide, color hex
- Eliminación con validación (no si tiene transacciones)

**2. Automatizaciones (gastos fijos):**
- Lista de recurrentes con nombre, frecuencia, categoría, importe, switch activo/inactivo
- Diálogo para crear/editar: nombre, importe, tipo, categoría, cuenta, frecuencia, fecha inicio
- Al crear/editar, ejecuta `processRecurringTransactions()` para generar proyecciones

---

### `SettingsPage` — Ajustes
**Ruta:** `/ajustes`

**Descripción:** Página de configuración:
- **AccountManager** embebido (gestión de cuentas)
- Selector de tema: Claro / Oscuro / Sistema

---

### `BackupPage` — Seguridad
**Ruta:** `/backup`

**Descripción:** Página de copias de seguridad:
- **Exportar:** descarga JSON con todos los datos
- **Importar:** seleccionar archivo JSON, migra datos, valida estructura, sobreescribe localStorage
- Advertencia destructiva sobre la importación
- Explicación de privacidad (datos solo locales)

---

### `GuidePage` — Guía
**Ruta:** `/guia`

**Descripción:** Página de ayuda/manual de usuario interactiva con explicaciones detalladas de cada funcionalidad de la app.

---

### `NotFound` — 404
**Ruta:** `*` (catch-all)

**Descripción:** Página simple de error 404 con enlace para volver al inicio. Logea intento de acceso a ruta inexistente.

---

## Punto de Entrada y Configuración

### `main.tsx`
```typescript
createRoot(document.getElementById("root")!).render(<App />);
```
Renderiza `<App />` sin StrictMode. Importa `index.css` como estilos globales.

### `App.tsx`
Componente raíz que configura:
1. `QueryClientProvider` (React Query — no se usa activamente pero está preparado)
2. `ThemeProvider` (next-themes: sistema de temas)
3. `TooltipProvider` (shadcn/ui)
4. `Toaster` + `Sonner` (notificaciones)
5. `SplashScreen` (pantalla de carga de 3s)
6. `BrowserRouter` con todas las rutas
7. `ScrollToTop` (reset scroll al cambiar ruta)
8. `useEffect` que ejecuta `processRecurringTransactions()` al iniciar

**Tabla de Rutas:**

| Ruta | Componente |
|---|---|
| `/` | `Index` |
| `/presupuestos` | `BudgetPage` |
| `/historial` | `HistoryPage` |
| `/comparativa` | `ComparisonPage` |
| `/medias` | `AveragesPage` |
| `/ajustes` | `SettingsPage` |
| `/backup` | `BackupPage` |
| `/transferir` | `TransferPage` |
| `/guia` | `GuidePage` |
| `/gestion` | `ManagementPage` |
| `*` | `NotFound` |

---

## Flujos Principales

### Flujo: Añadir transacción
1. Usuario toca "+" (FAB) o botón directo en MobileNav
2. Se abre `TransactionModal` con tipo (ingreso/gasto)
3. Rellena fecha, cuenta, importe, categoría
4. Opcionalmente marca como futuro (`isPending`) o recurrente
5. `Index.handleAddTransaction()`:
   - Si recurrente: crea `RecurringTransaction` + transacción real + genera proyecciones
   - Si normal: `addTransaction()`
   - Si edición: `updateTransaction()`
6. Se añade categoría si es nueva
7. Se recarga data y cierra modal

### Flujo: Transferencia entre cuentas
1. Usuario va a `/transferir`
2. Selecciona cuenta origen, destino e importe
3. `handleTransfer()`:
   - Crea transacción tipo `expense` en cuenta origen con categoría "Transferencia"
   - Crea transacción tipo `income` en cuenta destino con categoría "Transferencia"
4. Las transferencias se excluyen automáticamente de los cálculos de ingresos/gastos en el dashboard

### Flujo: Cuadrar saldos
1. Usuario va a `/comparativa`
2. Selecciona cuenta, introduce su saldo real
3. La app calcula la diferencia
4. Añade ajustes (ingresos/gastos olvidados) con categoría hasta que la diferencia sea 0
5. Al guardar, crea transacciones reales de ajuste

### Flujo: Backup/Restauración
1. **Exportar:** `loadData()` → `JSON.stringify()` → descarga como archivo `.json`
2. **Importar:** lee archivo → `JSON.parse()` → `migrateData()` → validación → `saveData()` → recargar app
