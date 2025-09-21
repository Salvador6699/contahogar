    <!DOCTYPE html>
    <html lang="{{ str_replace('_', '-', app()->getLocale()) }}" x-data x-init="if (localStorage.theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else if (localStorage.theme === 'light') {
        document.documentElement.classList.remove('dark');
    } else if (!('theme' in localStorage)) {
        // Si no hay nada en localStorage, seguimos el sistema
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }"
        :class="{ 'dark': localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia(
                '(prefers-color-scheme: dark)').matches) }">

    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>{{ config('app.name', 'Laravel') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

        <!-- Scripts -->
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>

    <body class="font-sans antialiased bg-bg text-text">
        <!-- Overlay para menú lateral -->
        <div class="sidebar-overlay fixed inset-0 bg-black bg-opacity-50 z-40 opacity-0 invisible transition-all duration-300" id="sidebar-overlay"></div>
        
        <!-- Menú lateral -->
        <aside class="sidebar fixed top-0 left-0 bottom-0 w-72 bg-surface border-r border-border z-50 transform -translate-x-full transition-transform duration-300 shadow-lg overflow-y-auto" id="sidebar">
            <div class="sidebar-header flex items-center justify-between p-6 border-b border-border">
                <h2 class="text-xl font-semibold text-text">Menú</h2>
                <button class="close-sidebar w-8 h-8 rounded-full bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center" id="close-sidebar">
                    <i class="fas fa-times text-text"></i>
                </button>
            </div>
            <nav class="sidebar-nav p-4">
                <a href="{{ route('dashboard') }}" class="sidebar-item flex items-center gap-3 p-3 rounded-lg text-text hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 {{ request()->routeIs('dashboard') ? 'bg-primary text-white' : '' }}">
                    <i class="fas fa-home w-5 text-center"></i>
                    <span>Dashboard</span>
                </a>
                <a href="#" class="sidebar-item flex items-center gap-3 p-3 rounded-lg text-text hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
                    <i class="fas fa-chart-line w-5 text-center"></i>
                    <span>Estadísticas</span>
                </a>
                <a href="#" class="sidebar-item flex items-center gap-3 p-3 rounded-lg text-text hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
                    <i class="fas fa-wallet w-5 text-center"></i>
                    <span>Cuentas</span>
                </a>
                <a href="#" class="sidebar-item flex items-center gap-3 p-3 rounded-lg text-text hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
                    <i class="fas fa-tags w-5 text-center"></i>
                    <span>Categorías</span>
                </a>
                <a href="#" class="sidebar-item flex items-center gap-3 p-3 rounded-lg text-text hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
                    <i class="fas fa-cog w-5 text-center"></i>
                    <span>Ajustes</span>
                </a>
                <a href="#" class="sidebar-item flex items-center gap-3 p-3 rounded-lg text-text hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
                    <i class="fas fa-question-circle w-5 text-center"></i>
                    <span>Ayuda</span>
                </a>
                <div class="border-t border-border my-4"></div>
                <form method="POST" action="{{ route('logout') }}">
                    @csrf
                    <button type="submit" class="sidebar-item w-full flex items-center gap-3 p-3 rounded-lg text-text hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
                        <i class="fas fa-sign-out-alt w-5 text-center"></i>
                        <span>Cerrar sesión</span>
                    </button>
                </form>
            </nav>
        </aside>

        <!-- Header -->
        <header class="sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-border p-3">
            <div class="header-content flex items-center justify-between max-w-7xl mx-auto">
                <div class="header-left flex items-center gap-2 sm:gap-4">
                    <button class="menu-btn w-10 h-10 rounded-full bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center" id="menu-btn">
                        <i class="fas fa-bars text-text"></i>
                    </button>
                    <div class="header-left flex items-center gap-2 sm:gap-3">
                        <a href="{{ route('dashboard') }}">
                            <img src="{{ asset('images/logo.png') }}" alt="Logo" class="w-8 h-8 sm:w-10 sm:h-10">
                        </a>
                        <h1 class="text-lg sm:text-xl font-semibold text-text leading-tight">ContaHogar</h1>
                    </div>
                </div>
                <div class="header-right flex items-center gap-2 sm:gap-4">
                    <button class="theme-toggle w-10 h-10 rounded-full bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center" id="theme-toggle">
                        <i class="fas fa-moon text-text"></i>
                    </button>
                </div>
            </div>
        </header>

        <!-- Page Content -->
        <main class="min-h-screen">
            {{ $slot }}
        </main>

        <!-- FAB (Floating Action Button) -->
        <button class="fab fixed bottom-20 right-4 sm:right-5 z-40 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center shadow-lg border-none cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl" id="add-transaction-btn">
            <i class="fas fa-plus text-lg sm:text-xl"></i>
        </button>

        <!-- Modal para nueva transacción -->
        <div class="modal-overlay fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4 opacity-0 invisible transition-all duration-300" id="modal-overlay">
            <div class="modal-content w-full max-w-sm sm:max-w-md bg-surface border border-border rounded-xl p-4 sm:p-6 relative shadow-xl transform translate-y-5 transition-all duration-300">
                <div class="modal-header flex items-center justify-between pb-4 border-b border-border mb-6">
                    <h2 class="modal-title text-xl font-semibold text-text">Nuevo movimiento</h2>
                    <button class="close-btn w-8 h-8 rounded-full bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center" id="close-modal">
                        <i class="fas fa-times text-text"></i>
                    </button>
                </div>
                <form class="modal-form flex flex-col gap-4" id="transaction-form">
                    <fieldset class="type-selector grid grid-cols-2 gap-3">
                        <label class="type-option flex items-center justify-center gap-2 rounded-xl border border-border p-3 cursor-pointer transition-all duration-200 selected border-primary bg-primary/10 text-primary">
                            <input type="radio" name="type" value="expense" checked class="hidden">
                            <i class="fas fa-arrow-down"></i>
                            <span>Gasto</span>
                        </label>
                        <label class="type-option flex items-center justify-center gap-2 rounded-xl border border-border p-3 cursor-pointer transition-all duration-200">
                            <input type="radio" name="type" value="income" class="hidden">
                            <i class="fas fa-arrow-up"></i>
                            <span>Ingreso</span>
                        </label>
                    </fieldset>

                    <div class="form-group flex flex-col">
                        <label class="form-label text-sm text-text/80 mb-2 font-medium">Cantidad</label>
                        <input type="number" inputmode="decimal" step="0.01" placeholder="0,00" class="form-input rounded-xl border border-border bg-surface p-3 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary" required>
                    </div>

                    <div class="form-row grid grid-cols-2 gap-3">
                        <div class="form-group flex flex-col">
                            <label class="form-label text-sm text-text/80 mb-2 font-medium">Categoría</label>
                            <select class="form-input rounded-xl border border-border bg-surface p-3 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary">
                                <option>Alimentación</option>
                                <option>Vivienda</option>
                                <option>Transporte</option>
                                <option>Ocio</option>
                                <option>Salud</option>
                                <option>Otros</option>
                            </select>
                        </div>
                        <div class="form-group flex flex-col">
                            <label class="form-label text-sm text-text/80 mb-2 font-medium">Fecha</label>
                            <input type="date" class="form-input rounded-xl border border-border bg-surface p-3 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary">
                        </div>
                    </div>

                    <div class="form-group flex flex-col">
                        <label class="form-label text-sm text-text/80 mb-2 font-medium">Nota (opcional)</label>
                        <input type="text" placeholder="Ej. Supermercado barrio" class="form-input rounded-xl border border-border bg-surface p-3 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary">
                    </div>

                    <div class="form-actions flex gap-3 pt-2">
                        <button type="button" class="cancel-btn flex-1 rounded-xl border border-border p-3 bg-transparent cursor-pointer font-medium transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800" id="cancel-form">Cancelar</button>
                        <button type="submit" class="submit-btn flex-1 rounded-xl border-none p-3 bg-gradient-to-r from-primary to-primary/80 text-white cursor-pointer font-medium transition-all duration-200 hover:from-primary/90 hover:to-primary/70">Guardar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Bottom Navigation -->
        <nav class="bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
            <ul class="nav-list grid grid-cols-4 max-w-7xl mx-auto list-none p-0">
                <li>
                    <a href="{{ route('dashboard') }}" class="nav-item flex flex-col items-center gap-1 py-3 text-xs text-text/60 hover:text-primary transition-colors duration-200 w-full bg-none border-none cursor-pointer {{ request()->routeIs('dashboard') ? 'text-primary' : '' }}">
                        <i class="fas fa-home nav-icon h-5 w-5"></i>
                        <span>Inicio</span>
                    </a>
                </li>
                <li>
                    <a href="{{ route('analytics') }}" class="nav-item flex flex-col items-center gap-1 py-3 text-xs text-text/60 hover:text-primary transition-colors duration-200 w-full bg-none border-none cursor-pointer {{ request()->routeIs('analytics') ? 'text-primary' : '' }}">
                        <i class="fas fa-chart-pie nav-icon h-5 w-5"></i>
                        <span>Gráficos</span>
                    </a>
                </li>
                <li>
                    <a href="{{ route('reports') }}" class="nav-item flex flex-col items-center gap-1 py-3 text-xs text-text/60 hover:text-primary transition-colors duration-200 w-full bg-none border-none cursor-pointer {{ request()->routeIs('reports') ? 'text-primary' : '' }}">
                        <i class="fas fa-file-alt nav-icon h-5 w-5"></i>
                        <span>Reportes</span>
                    </a>
                </li>
                <li>
                    <a href="{{ route('settings') }}" class="nav-item flex flex-col items-center gap-1 py-3 text-xs text-text/60 hover:text-primary transition-colors duration-200 w-full bg-none border-none cursor-pointer {{ request()->routeIs('settings') ? 'text-primary' : '' }}">
                        <i class="fas fa-cog nav-icon h-5 w-5"></i>
                        <span>Ajustes</span>
                    </a>
                </li>
            </ul>
        </nav>
    </body>

    </html>
