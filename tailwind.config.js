import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';


/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
    ],
    darkMode: 'class',

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                'bg': 'var(--color-bg)',
                'text': 'var(--color-text)',
                'primary': 'var(--color-primary)',
                'secondary': 'var(--color-secondary)',
                'accent': 'var(--color-accent)',
                'surface': 'var(--color-surface)',
                'border': 'var(--color-border)',
            },
        },
    },

    plugins: [forms],
};
