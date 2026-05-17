<?php
// Configuración Dinámica de la base de datos
if (strpos(isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '', 'localhost') !== false || strpos(isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '', '192.168.') !== false) {
    // Entorno LOCAL
    define('DB_HOST', 'localhost');
    define('DB_USER', 'root');
    define('DB_PASS', '');
    define('DB_NAME', 'contahogar');
} else {
    // Entorno SERVIDOR (CDmon)
    define('DB_HOST', 'localhost');
    define('DB_USER', 'mytabsyste03');
    define('DB_PASS', 'Resiliencia@2025');
    // En la captura de phpMyAdmin la DB se llama 'contahogar', no 'mytabsyste03_contahogar'
    define('DB_NAME', 'contahogar');
}

// Habilitar errores para poder depurar qué falla en CDmon
error_reporting(E_ALL);
ini_set('display_errors', 1);
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Configuración de CORS para poder acceder desde React en modo desarrollo
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Manejar las peticiones pre-flight de CORS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

function getDB()
{
    try {
        $db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($db->connect_error) {
            echo json_encode(["success" => false, "message" => "Error de conexión: " . $db->connect_error]);
            exit();
        }
        $db->set_charset("utf8mb4");
        return $db;
    } catch (Exception $e) {
        echo json_encode(["success" => false, "message" => "Excepción de conexión MySQL: " . $e->getMessage()]);
        exit();
    }
}
?>