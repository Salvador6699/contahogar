<section class="space-y-6">
    <header>
        <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <i class="fas fa-adjust"></i> Preferencias de tema
        </h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Elige cómo quieres que se vea la aplicación: claro, oscuro o según tu sistema.
        </p>
    </header>

    <div x-data="{ 
            setTheme(theme) {
                if (theme === 'system') {
                    localStorage.removeItem('theme');
                    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                } else {
                    localStorage.theme = theme;
                    document.documentElement.classList.toggle('dark', theme === 'dark');
                }
            } 
        }" 
        class="flex gap-2">

        <!-- Botón Claro -->
        <button @click="setTheme('light')" 
                class="flex items-center gap-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition">
            <i class="fas fa-sun"></i> Claro
        </button>

        <!-- Botón Oscuro -->
        <button @click="setTheme('dark')" 
                class="flex items-center gap-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition">
            <i class="fas fa-moon"></i> Oscuro
        </button>

        <!-- Botón Sistema -->
        <button @click="setTheme('system')" 
                class="flex items-center gap-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition">
            <i class="fas fa-desktop"></i> Sistema
        </button>
    </div>
</section>
