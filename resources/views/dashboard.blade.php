<x-app-layout>
    <div class="container max-w-7xl mx-auto px-4 py-6 pb-20">
        <!-- Snapshot Cards -->
        <section class="card-grid grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div class="card card-main bg-gradient-to-br from-primary to-primary/80 text-white rounded-xl p-6 shadow-lg">
                <div class="card-header flex items-center justify-between mb-4">
                    <div>
                        <p class="card-title text-white/80 text-sm font-medium uppercase tracking-wide">Saldo disponible</p>
                        <p class="card-value text-3xl font-bold">820,34 €</p>
                    </div>
                    <i class="fas fa-wallet text-2xl text-white/80"></i>
                </div>
                <div class="card-footer pt-4 border-t border-white/20">
                    <span class="text-white/90 text-sm"><i class="fas fa-arrow-up mr-1"></i> 12% desde el mes pasado</span>
                </div>
            </div>

            <div class="card card-hover bg-surface border border-border rounded-xl p-6 shadow hover:shadow-md transition-shadow duration-300">
                <p class="card-title text-text/60 text-sm font-medium uppercase tracking-wide mb-2">Gasto del mes</p>
                <p class="card-value text-2xl font-bold text-text mb-4">579,66 €</p>
                <div class="progress-bar bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                    <div class="progress-fill bg-gradient-to-r from-rose-500 to-amber-500 h-2 rounded-full" style="width: 58%;"></div>
                </div>
                <div class="card-footer text-sm text-text/60">
                    <span>Presupuesto: 1.000 €</span>
                </div>
            </div>

            <div class="card card-hover bg-surface border border-border rounded-xl p-6 shadow hover:shadow-md transition-shadow duration-300">
                <p class="card-title text-text/60 text-sm font-medium uppercase tracking-wide mb-2">Ingresos del mes</p>
                <p class="card-value text-2xl font-bold text-emerald-500 mb-4">1.200,00 €</p>
                <div class="card-footer text-sm text-emerald-500">
                    <span><i class="fas fa-arrow-up mr-1"></i> 8% desde el mes pasado</span>
                </div>
            </div>
        </section>

        <!-- Charts Section -->
        <section class="chart-container mb-8">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="chart-card bg-surface border border-border rounded-xl p-6 shadow hover:shadow-md transition-shadow duration-300">
                    <div class="chart-header flex items-center justify-between mb-4">
                        <h3 class="chart-title text-lg font-semibold text-text">Distribución de gastos</h3>
                        <button class="view-all text-sm text-primary hover:text-primary/80 underline">Ver todo</button>
                    </div>
                    <div class="chart-canvas h-64 w-full">
                        <canvas id="expensesChart"></canvas>
                    </div>
                    <div class="categories-list grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
                        <div class="category-item flex items-center gap-2">
                            <span class="category-color w-3 h-3 rounded-full bg-indigo-500"></span>
                            <span class="category-name text-text/80">Alimentación</span>
                            <span class="category-value font-semibold text-text">220,00 €</span>
                        </div>
                        <div class="category-item flex items-center gap-2">
                            <span class="category-color w-3 h-3 rounded-full bg-emerald-500"></span>
                            <span class="category-name text-text/80">Vivienda</span>
                            <span class="category-value font-semibold text-text">180,00 €</span>
                        </div>
                        <div class="category-item flex items-center gap-2">
                            <span class="category-color w-3 h-3 rounded-full bg-cyan-500"></span>
                            <span class="category-name text-text/80">Transporte</span>
                            <span class="category-value font-semibold text-text">75,00 €</span>
                        </div>
                        <div class="category-item flex items-center gap-2">
                            <span class="category-color w-3 h-3 rounded-full bg-amber-500"></span>
                            <span class="category-name text-text/80">Ocio</span>
                            <span class="category-value font-semibold text-text">60,00 €</span>
                        </div>
                        <div class="category-item flex items-center gap-2">
                            <span class="category-color w-3 h-3 rounded-full bg-rose-500"></span>
                            <span class="category-name text-text/80">Otros</span>
                            <span class="category-value font-semibold text-text">44,00 €</span>
                        </div>
                    </div>
                </div>

                <div class="chart-card bg-surface border border-border rounded-xl p-6 shadow hover:shadow-md transition-shadow duration-300">
                    <div class="chart-header flex items-center justify-between mb-4">
                        <h3 class="chart-title text-lg font-semibold text-text">Ingresos vs Gastos</h3>
                        <button class="view-all text-sm text-primary hover:text-primary/80 underline">Mes actual</button>
                    </div>
                    <div class="chart-canvas h-64 w-full">
                        <canvas id="incomeVsExpensesChart"></canvas>
                    </div>
                </div>
            </div>
        </section>

        <!-- Recent Transactions -->
        <section class="transactions-container">
            <div class="transactions-header flex items-center justify-between mb-4">
                <h3 class="transactions-title text-xl font-semibold text-text">Movimientos recientes</h3>
                <button class="filter-btn inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm border border-border bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
                    <i class="fas fa-filter"></i>
                    Filtrar
                </button>
            </div>
            <ul class="transaction-list space-y-3" id="transaction-list">
                <li class="transaction-item bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow transition-shadow duration-200 flex items-center gap-4">
                    <div class="transaction-icon w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="transaction-details flex-1 min-w-0">
                        <p class="transaction-title font-medium text-text truncate">Supermercado</p>
                        <p class="transaction-meta text-sm text-text/60 flex items-center gap-1 mt-1">
                            <i class="far fa-calendar"></i> 20/08/2025 • Alimentación
                        </p>
                    </div>
                    <div class="transaction-amount text-lg font-semibold text-rose-500">-24,90 €</div>
                </li>
                <li class="transaction-item bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow transition-shadow duration-200 flex items-center gap-4">
                    <div class="transaction-icon w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
                        <i class="fas fa-gas-pump"></i>
                    </div>
                    <div class="transaction-details flex-1 min-w-0">
                        <p class="transaction-title font-medium text-text truncate">Gasolina</p>
                        <p class="transaction-meta text-sm text-text/60 flex items-center gap-1 mt-1">
                            <i class="far fa-calendar"></i> 19/08/2025 • Transporte
                        </p>
                    </div>
                    <div class="transaction-amount text-lg font-semibold text-rose-500">-45,00 €</div>
                </li>
                <li class="transaction-item bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow transition-shadow duration-200 flex items-center gap-4">
                    <div class="transaction-icon w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
                        <i class="fas fa-money-check"></i>
                    </div>
                    <div class="transaction-details flex-1 min-w-0">
                        <p class="transaction-title font-medium text-text truncate">Nómina</p>
                        <p class="transaction-meta text-sm text-text/60 flex items-center gap-1 mt-1">
                            <i class="far fa-calendar"></i> 15/08/2025 • Ingreso
                        </p>
                    </div>
                    <div class="transaction-amount text-lg font-semibold text-emerald-500">+1.200,00 €</div>
                </li>
                <li class="transaction-item bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow transition-shadow duration-200 flex items-center gap-4">
                    <div class="transaction-icon w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
                        <i class="fas fa-tv"></i>
                    </div>
                    <div class="transaction-details flex-1 min-w-0">
                        <p class="transaction-title font-medium text-text truncate">Netflix</p>
                        <p class="transaction-meta text-sm text-text/60 flex items-center gap-1 mt-1">
                            <i class="far fa-calendar"></i> 10/08/2025 • Ocio
                        </p>
                    </div>
                    <div class="transaction-amount text-lg font-semibold text-rose-500">-15,99 €</div>
                </li>
            </ul>
        </section>
    </div>
</x-app-layout>
