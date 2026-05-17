<?php
ob_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once 'config.php';

function responseJson($data) {
    if (ob_get_level()) ob_clean();
    echo json_encode($data);
    exit();
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'load') {
    $db = getDB();
    $data = [
        'accounts' => [],
        'transactions' => [],
        'categories' => [],
        'budgets' => [],
        'recurringTransactions' => [],
        'favorites' => [],
        'savingsGoals' => [],
        'alertSettings' => null
    ];

    function fetchTable($db, $query) {
        try {
            $res = $db->query($query);
            if (!$res) {
                responseJson(["success" => false, "message" => "Table error or missing table: " . $db->error]);
            }
        } catch (Exception $e) {
            responseJson(["success" => false, "message" => "Database exception: " . $e->getMessage()]);
        }
        $rows = [];
        while ($row = $res->fetch_assoc()) {
            $rows[] = $row;
        }
        return $rows;
    }

    // Cargar accounts
    $rows = fetchTable($db, "SELECT * FROM accounts");
    foreach ($rows as $row) {
        $row['initialBalance'] = (float)$row['initialBalance'];
        $data['accounts'][] = $row;
    }

    // Cargar transactions
    $rows = fetchTable($db, "SELECT * FROM transactions");
    foreach ($rows as $row) {
        $row['amount'] = (float)$row['amount'];
        $row['isPending'] = (bool)$row['isPending'];
        $data['transactions'][] = $row;
    }

    // Cargar categories
    $rows = fetchTable($db, "SELECT * FROM categories");
    foreach ($rows as $row) {
        if ($row['monthlyLimit'] !== null) $row['monthlyLimit'] = (float)$row['monthlyLimit'];
        $data['categories'][] = $row;
    }

    // Cargar budgets
    $rows = fetchTable($db, "SELECT * FROM budgets");
    foreach ($rows as $row) {
        $row['amount'] = (float)$row['amount'];
        $data['budgets'][] = $row;
    }

    // Cargar recurring_transactions
    $rows = fetchTable($db, "SELECT * FROM recurring_transactions");
    foreach ($rows as $row) {
        $row['amount'] = (float)$row['amount'];
        $row['isActive'] = (bool)$row['isActive'];
        if ($row['intervalMonths'] !== null) $row['intervalMonths'] = (int)$row['intervalMonths'];
        if ($row['endAfterMonths'] !== null) $row['endAfterMonths'] = (int)$row['endAfterMonths'];
        $data['recurringTransactions'][] = $row;
    }

    // Cargar favorites
    $rows = fetchTable($db, "SELECT * FROM favorites");
    foreach ($rows as $row) {
        $row['amount'] = (float)$row['amount'];
        $data['favorites'][] = $row;
    }

    // Cargar savings_goals
    $rows = fetchTable($db, "SELECT * FROM savings_goals");
    foreach ($rows as $row) {
        $row['targetAmount'] = (float)$row['targetAmount'];
        $row['currentAmount'] = (float)$row['currentAmount'];
        $data['savingsGoals'][] = $row;
    }

    // Cargar settings (alertSettings)
    try {
        $res = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'alertSettings'");
        if ($res && $row = $res->fetch_assoc()) {
            $data['alertSettings'] = json_decode($row['setting_value'], true);
        }
    } catch (Exception $e) {
        responseJson(["success" => false, "message" => "Database exception in settings: " . $e->getMessage()]);
    }

    responseJson(["success" => true, "data" => $data]);
    $db->close();
    exit();
}

if ($action === 'save') {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!$data) {
        responseJson(["success" => false, "message" => "Invalid JSON payload"]);
    }

    $db = getDB();
    
    // Iniciar transacción para asegurar la integridad de los datos
    $db->begin_transaction();

    try {
        // Como la app actualmente manda el estado completo (como en localStorage),
        // vaciamos las tablas y las volvemos a llenar. Esto asegura que los elementos
        // eliminados también desaparezcan de la DB.
        $db->query("SET FOREIGN_KEY_CHECKS = 0");
        $db->query("TRUNCATE TABLE accounts");
        $db->query("TRUNCATE TABLE categories");
        $db->query("TRUNCATE TABLE transactions");
        $db->query("TRUNCATE TABLE recurring_transactions");
        $db->query("TRUNCATE TABLE budgets");
        $db->query("TRUNCATE TABLE favorites");
        $db->query("TRUNCATE TABLE savings_goals");
        $db->query("TRUNCATE TABLE settings");

        // Preparar sentencias
        $stmtAcc = $db->prepare("INSERT INTO accounts (id, name, initialBalance, linkedAccountId, logo) VALUES (?, ?, ?, ?, ?)");
        if (!empty($data['accounts'])) {
            foreach ($data['accounts'] as $item) {
                $linkedId = isset($item['linkedAccountId']) ? $item['linkedAccountId'] : null;
                $logo = isset($item['logo']) ? $item['logo'] : null;
                $stmtAcc->bind_param("ssdss", $item['id'], $item['name'], $item['initialBalance'], $linkedId, $logo);
                $stmtAcc->execute();
            }
        }

        $stmtCat = $db->prepare("INSERT INTO categories (id, name, icon, color, monthlyLimit, customIcon) VALUES (?, ?, ?, ?, ?, ?)");
        if (!empty($data['categories'])) {
            foreach ($data['categories'] as $item) {
                $icon = isset($item['icon']) ? $item['icon'] : null;
                $color = isset($item['color']) ? $item['color'] : null;
                $limit = isset($item['monthlyLimit']) ? $item['monthlyLimit'] : null;
                $cIcon = isset($item['customIcon']) ? $item['customIcon'] : null;
                $stmtCat->bind_param("ssssds", $item['id'], $item['name'], $icon, $color, $limit, $cIcon);
                $stmtCat->execute();
            }
        }

        $stmtTx = $db->prepare("INSERT INTO transactions (id, date, amount, category, type, accountId, description, isPending) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        if (!empty($data['transactions'])) {
            foreach ($data['transactions'] as $item) {
                $desc = isset($item['description']) ? $item['description'] : null;
                $pending = !empty($item['isPending']) ? 1 : 0;
                $stmtTx->bind_param("ssdssssi", $item['id'], $item['date'], $item['amount'], $item['category'], $item['type'], $item['accountId'], $desc, $pending);
                $stmtTx->execute();
            }
        }

        $stmtRec = $db->prepare("INSERT INTO recurring_transactions (id, name, amount, type, category, accountId, frequency, intervalMonths, endAfterMonths, startDate, lastGeneratedDate, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if (!empty($data['recurringTransactions'])) {
            foreach ($data['recurringTransactions'] as $item) {
                $intM = isset($item['intervalMonths']) ? $item['intervalMonths'] : null;
                $endM = isset($item['endAfterMonths']) ? $item['endAfterMonths'] : null;
                $lastD = isset($item['lastGeneratedDate']) ? $item['lastGeneratedDate'] : null;
                $active = !empty($item['isActive']) ? 1 : 0;
                $stmtRec->bind_param("ssdssssiisss", $item['id'], $item['name'], $item['amount'], $item['type'], $item['category'], $item['accountId'], $item['frequency'], $intM, $endM, $item['startDate'], $lastD, $active);
                $stmtRec->execute();
            }
        }

        $stmtBud = $db->prepare("INSERT INTO budgets (id, category, amount, month) VALUES (?, ?, ?, ?)");
        if (!empty($data['budgets'])) {
            foreach ($data['budgets'] as $item) {
                $stmtBud->bind_param("ssds", $item['id'], $item['category'], $item['amount'], $item['month']);
                $stmtBud->execute();
            }
        }

        $stmtFav = $db->prepare("INSERT INTO favorites (id, name, amount, category, accountId, description, type, icon, customIcon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if (!empty($data['favorites'])) {
            foreach ($data['favorites'] as $item) {
                $desc = isset($item['description']) ? $item['description'] : null;
                $icon = isset($item['icon']) ? $item['icon'] : null;
                $cIcon = isset($item['customIcon']) ? $item['customIcon'] : null;
                $stmtFav->bind_param("ssdssssss", $item['id'], $item['name'], $item['amount'], $item['category'], $item['accountId'], $desc, $item['type'], $icon, $cIcon);
                $stmtFav->execute();
            }
        }

        $stmtSav = $db->prepare("INSERT INTO savings_goals (id, name, targetAmount, currentAmount, deadline, accountId, color, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        if (!empty($data['savingsGoals'])) {
            foreach ($data['savingsGoals'] as $item) {
                $dead = isset($item['deadline']) ? $item['deadline'] : null;
                $acc = isset($item['accountId']) ? $item['accountId'] : null;
                $col = isset($item['color']) ? $item['color'] : null;
                $cat = isset($item['category']) ? $item['category'] : null;
                $curr = isset($item['currentAmount']) ? $item['currentAmount'] : 0;
                $stmtSav->bind_param("ssddssss", $item['id'], $item['name'], $item['targetAmount'], $curr, $dead, $acc, $col, $cat);
                $stmtSav->execute();
            }
        }

        if (isset($data['alertSettings'])) {
            $stmtSet = $db->prepare("INSERT INTO settings (setting_key, setting_value) VALUES ('alertSettings', ?)");
            $jsonStr = json_encode($data['alertSettings']);
            $stmtSet->bind_param("s", $jsonStr);
            $stmtSet->execute();
        }

        $db->query("SET FOREIGN_KEY_CHECKS = 1");
        $db->commit();

        responseJson(["success" => true, "message" => "Data saved successfully"]);
    } catch (Exception $e) {
        $db->rollback();
        responseJson(["success" => false, "message" => "Error saving data: " . $e->getMessage()]);
    }

    $db->close();
    exit();
}

responseJson(["success" => false, "message" => "Invalid action specified"]);
?>
