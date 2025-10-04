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
    @include('layouts.partials.head')
</head>

<body class="font-sans antialiased bg-bg text-text">
    @include('layouts.partials.sidebar')

    @include('layouts.partials.header')

    <!-- Page Content -->
    <main class="min-h-screen">
        {{ $slot }}
    </main>

    @include('layouts.partials.fab')

    @include('layouts.partials.modal')

    @include('layouts.partials.bottom-nav')
</body>

</html>