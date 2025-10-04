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