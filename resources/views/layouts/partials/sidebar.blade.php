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