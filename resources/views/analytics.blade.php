<x-app-layout>
    <div class="container max-w-7xl mx-auto px-4 py-6 pb-20">
        <!-- Section Header -->
        <section class="mb-8">
            <div class="section-header flex items-center justify-between mb-6">
                <h2 class="text-2xl font-bold text-text">Análisis Detallado</h2>
                <select class="period-selector border border-border bg-surface rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>Últimos 7 días</option>
                    <option>Mes actual</option>
                    <option>Últimos 3 meses</option>
                    <option>Este año</option>
                </select>
            </div>
        </section>
        
        <!-- Charts Section -->
        <section class="chart-container">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="chart-card bg-surface border border-border rounded-xl p-6 shadow hover:shadow-md transition-shadow duration-300">
                    <div class="chart-header flex items-center justify-between mb-4">
                        <h3 class="chart-title text-lg font-semibold text-text">Distribución de gastos</h3>
                        <button class="view-all text-sm text-primary hover:text-primary/80 underline">Ver todo</button>
                    </div>
                    <div class="chart-canvas h-64 w-full">
                        <canvas id="analyticsExpensesChart"></canvas>
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
                        <canvas id="analyticsIncomeVsExpensesChart"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="chart-card bg-surface border border-border rounded-xl p-6 shadow hover:shadow-md transition-shadow duration-300">
                <div class="chart-header flex items-center justify-between mb-4">
                    <h3 class="chart-title text-lg font-semibold text-text">Tendencia de gastos</h3>
                    <button class="view-all text-sm text-primary hover:text-primary/80 underline">Ver detalle</button>
                </div>
                <div class="chart-canvas h-64 w-full">
                    <canvas id="trendChart"></canvas>
                </div>
            </div>
        </section>
    </div>
</x-app-layout>
