<x-app-layout>
    <div class="container max-w-7xl mx-auto px-4 py-6 pb-20">
        <!-- Section Header -->
        <section class="mb-8">
            <h2 class="section-title text-2xl font-bold text-text mb-6">Ajustes</h2>
        </section>
        
        <!-- Settings Groups -->
        <section class="settings-container">
            <!-- Preferencias -->
            <div class="settings-group mb-8">
                <h3 class="settings-group-title text-lg font-semibold text-text mb-4 pb-2 border-b border-border">Preferencias</h3>
                
                <div class="setting-card bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow transition-shadow duration-200 flex items-center justify-between mb-3">
                    <div class="setting-info flex items-center gap-4">
                        <i class="fas fa-palette text-xl text-primary w-6 text-center"></i>
                        <div>
                            <p class="setting-title text-base font-medium text-text mb-1">Tema de la aplicación</p>
                            <p class="setting-desc text-sm text-text/60">Elige entre tema claro u oscuro</p>
                        </div>
                    </div>
                    <select class="setting-control border border-border bg-surface rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" id="theme-select">
                        <option value="auto">Sistema</option>
                        <option value="light">Claro</option>
                        <option value="dark">Oscuro</option>
                    </select>
                </div>
                
                <div class="setting-card bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow transition-shadow duration-200 flex items-center justify-between mb-3">
                    <div class="setting-info flex items-center gap-4">
                        <i class="fas fa-bell text-xl text-primary w-6 text-center"></i>
                        <div>
                            <p class="setting-title text-base font-medium text-text mb-1">Notificaciones</p>
                            <p class="setting-desc text-sm text-text/60">Recibir recordatorios de gastos</p>
                        </div>
                    </div>
                    <label class="switch relative inline-block w-12 h-6">
                        <input type="checkbox" checked class="opacity-0 w-0 h-0">
                        <span class="slider absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-gray-300 dark:bg-gray-700 transition-all duration-400 rounded-full"></span>
                    </label>
                </div>
                
                <div class="setting-card bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow transition-shadow duration-200 flex items-center justify-between mb-3">
                    <div class="setting-info flex items-center gap-4">
                        <i class="fas fa-database text-xl text-primary w-6 text-center"></i>
                        <div>
                            <p class="setting-title text-base font-medium text-text mb-1">Exportar datos</p>
                            <p class="setting-desc text-sm text-text/60">Descarga tus datos en formato CSV</p>
                        </div>
                    </div>
                    <button class="export-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm border border-primary bg-primary text-white hover:bg-primary/90 transition-colors duration-200">
                        <i class="fas fa-download"></i>
                        Exportar
                    </button>
                </div>
            </div>
            
            <!-- Cuenta -->
            <div class="settings-group mb-8">
                <h3 class="settings-group-title text-lg font-semibold text-text mb-4 pb-2 border-b border-border">Cuenta</h3>
                
                <div class="setting-card bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow transition-shadow duration-200 flex items-center justify-between mb-3">
                    <div class="setting-info flex items-center gap-4">
                        <i class="fas fa-user text-xl text-primary w-6 text-center"></i>
                        <div>
                            <p class="setting-title text-base font-medium text-text mb-1">Información del perfil</p>
                            <p class="setting-desc text-sm text-text/60">Gestiona tus datos personales</p>
                        </div>
                    </div>
                    <a href="{{ route('profile.edit') }}" class="text-btn border-none bg-transparent text-primary cursor-pointer text-sm font-medium hover:text-primary/80 transition-colors duration-200">
                        Editar
                    </a>
                </div>
                
                <div class="setting-card bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow transition-shadow duration-200 flex items-center justify-between mb-3">
                    <div class="setting-info flex items-center gap-4">
                        <i class="fas fa-shield-alt text-xl text-primary w-6 text-center"></i>
                        <div>
                            <p class="setting-title text-base font-medium text-text mb-1">Seguridad</p>
                            <p class="setting-desc text-sm text-text/60">Cambia tu contraseña</p>
                        </div>
                    </div>
                    <button class="text-btn border-none bg-transparent text-primary cursor-pointer text-sm font-medium hover:text-primary/80 transition-colors duration-200">
                        Cambiar
                    </button>
                </div>
            </div>
            
            <!-- Soporte -->
            <div class="settings-group mb-8">
                <h3 class="settings-group-title text-lg font-semibold text-text mb-4 pb-2 border-b border-border">Soporte</h3>
                
                <div class="setting-card bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow transition-shadow duration-200 flex items-center justify-between mb-3">
                    <div class="setting-info flex items-center gap-4">
                        <i class="fas fa-question-circle text-xl text-primary w-6 text-center"></i>
                        <div>
                            <p class="setting-title text-base font-medium text-text mb-1">Centro de ayuda</p>
                            <p class="setting-desc text-sm text-text/60">Encuentra respuestas a tus preguntas</p>
                        </div>
                    </div>
                    <button class="text-btn border-none bg-transparent text-primary cursor-pointer text-sm font-medium hover:text-primary/80 transition-colors duration-200">
                        Ver ayuda
                    </button>
                </div>
                
                <div class="setting-card bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow transition-shadow duration-200 flex items-center justify-between mb-3">
                    <div class="setting-info flex items-center gap-4">
                        <i class="fas fa-info-circle text-xl text-primary w-6 text-center"></i>
                        <div>
                            <p class="setting-title text-base font-medium text-text mb-1">Acerca de</p>
                            <p class="setting-desc text-sm text-text/60">Versión 2.1.0</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</x-app-layout>
