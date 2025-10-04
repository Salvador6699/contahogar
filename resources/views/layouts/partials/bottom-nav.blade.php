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