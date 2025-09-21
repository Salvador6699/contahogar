<x-app-layout>
    <div class="container max-w-7xl mx-auto px-4 py-6 pb-20">
        <!-- Section Header -->
        <section class="mb-8">
            <div class="section-header flex items-center justify-between mb-6">
                <h2 class="text-2xl font-bold text-text">Reportes</h2>
                <button class="download-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm border border-primary bg-primary text-white hover:bg-primary/90 transition-colors duration-200">
                    <i class="fas fa-download"></i>
                    Exportar PDF
                </button>
            </div>
        </section>
        
        <!-- Savings Chart -->
        <section class="chart-container mb-8">
            <div class="chart-card bg-surface border border-border rounded-xl p-6 shadow hover:shadow-md transition-shadow duration-300 mb-6">
                <h3 class="chart-title text-lg font-semibold text-text mb-4">Ahorro mensual</h3>
                <div class="chart-canvas h-64 w-full">
                    <canvas id="savingsChart"></canvas>
                </div>
            </div>
            
            <!-- Stats Grid -->
            <div class="stats-grid grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div class="stat-card bg-surface border border-border rounded-xl p-6 shadow hover:shadow-md transition-shadow duration-300 flex items-center gap-4">
                    <div class="stat-icon w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white">
                        <i class="fas fa-piggy-bank"></i>
                    </div>
                    <div class="stat-content flex-1">
                        <p class="stat-title text-sm text-text/60 mb-1">Ahorro total</p>
                        <p class="stat-value text-2xl font-bold text-text">1.200 €</p>
                    </div>
                </div>
                
                <div class="stat-card bg-surface border border-border rounded-xl p-6 shadow hover:shadow-md transition-shadow duration-300 flex items-center gap-4">
                    <div class="stat-icon w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="stat-content flex-1">
                        <p class="stat-title text-sm text-text/60 mb-1">Tasa de ahorro</p>
                        <p class="stat-value text-2xl font-bold text-emerald-500">18%</p>
                    </div>
                </div>
            </div>
            
            <!-- Year Summary -->
            <div class="chart-card bg-surface border border-border rounded-xl p-6 shadow hover:shadow-md transition-shadow duration-300">
                <h3 class="chart-title text-lg font-semibold text-text mb-4">Resumen del año</h3>
                <div class="year-summary flex flex-col gap-4">
                    <div class="summary-item flex items-center justify-between pb-2 border-b border-border">
                        <span class="summary-label text-sm text-text/60">Ingresos totales</span>
                        <span class="summary-value text-lg font-semibold text-text">8.400 €</span>
                    </div>
                    <div class="summary-item flex items-center justify-between pb-2 border-b border-border">
                        <span class="summary-label text-sm text-text/60">Gastos totales</span>
                        <span class="summary-value text-lg font-semibold text-text">6.900 €</span>
                    </div>
                    <div class="summary-item flex items-center justify-between">
                        <span class="summary-label text-sm text-text/60">Ahorro anual</span>
                        <span class="summary-value text-lg font-semibold text-emerald-500">1.500 €</span>
                    </div>
                </div>
            </div>
        </section>
    </div>
</x-app-layout>
