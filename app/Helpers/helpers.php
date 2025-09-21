<?php

if (! function_exists('get_initials')) {
    /**
     * Devuelve las iniciales en mayúsculas de una cadena.
     */
    function get_initials(string $string): string
    {
        $words = preg_split('/\s+/', trim($string));
        $initials = '';

        foreach ($words as $word) {
            if (mb_strlen($word) > 0) {
                $initials .= mb_strtoupper(mb_substr($word, 0, 1));
            }
        }

        return $initials;
    }
}
