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

function runMigrations($db) {
    // accounts
    if ($db->query("SHOW COLUMNS FROM accounts LIKE 'excludeFromTotals'")->num_rows == 0) {
        $db->query("ALTER TABLE accounts ADD COLUMN excludeFromTotals BOOLEAN DEFAULT 0");
    }
    // transactions
    if ($db->query("SHOW COLUMNS FROM transactions LIKE 'isIgnored'")->num_rows == 0) {
        $db->query("ALTER TABLE transactions ADD COLUMN isIgnored BOOLEAN DEFAULT 0");
    }
    if ($db->query("SHOW COLUMNS FROM transactions LIKE 'linkedLoanId'")->num_rows == 0) {
        $db->query("ALTER TABLE transactions ADD COLUMN linkedLoanId VARCHAR(100) NULL");
    }
    // recurring_transactions
    if ($db->query("SHOW COLUMNS FROM recurring_transactions LIKE 'customInterval'")->num_rows == 0) {
        $db->query("ALTER TABLE recurring_transactions ADD COLUMN customInterval INT NULL");
    }
    if ($db->query("SHOW COLUMNS FROM recurring_transactions LIKE 'customIntervalUnit'")->num_rows == 0) {
        $db->query("ALTER TABLE recurring_transactions ADD COLUMN customIntervalUnit VARCHAR(20) NULL");
    }
    if ($db->query("SHOW COLUMNS FROM recurring_transactions LIKE 'savingsPriority'")->num_rows == 0) {
        $db->query("ALTER TABLE recurring_transactions ADD COLUMN savingsPriority INT NULL");
    }
    // budgets
    if ($db->query("SHOW COLUMNS FROM budgets LIKE 'isAuto'")->num_rows == 0) {
        $db->query("ALTER TABLE budgets ADD COLUMN isAuto BOOLEAN DEFAULT 0");
    }
    // savings_goals
    if ($db->query("SHOW COLUMNS FROM savings_goals LIKE 'priority'")->num_rows == 0) {
        $db->query("ALTER TABLE savings_goals ADD COLUMN priority INT NULL");
    }
    if ($db->query("SHOW COLUMNS FROM savings_goals LIKE 'isIgnored'")->num_rows == 0) {
        $db->query("ALTER TABLE savings_goals ADD COLUMN isIgnored BOOLEAN DEFAULT 0");
    }
    // loans table
    $db->query("CREATE TABLE IF NOT EXISTS loans (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        installments INT NOT NULL,
        installmentAmount DECIMAL(12,2) NOT NULL,
        setupFee DECIMAL(12,2) NOT NULL DEFAULT 0,
        startDate DATE NOT NULL,
        accountId VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        isStarted BOOLEAN DEFAULT 0,
        startingPaidAmount DECIMAL(12,2) DEFAULT 0,
        originalTransactionData LONGTEXT NULL,
        FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
    )");
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'load') {
    $db = getDB();
    
    runMigrations($db);

    $data = [
        'accounts' => [],
        'transactions' => [],
        'categories' => [],
        'budgets' => [],
        'recurringRules' => [],
        'favorites' => [],
        'savingsGoals' => [],
        'loans' => [],
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
        $row['excludeFromTotals'] = (bool)$row['excludeFromTotals'];
        $data['accounts'][] = $row;
    }

    // Cargar transactions
    $res = $db->query("SELECT * FROM transactions");
    while ($row = $res->fetch_assoc()) {
        $row['amount'] = (float)$row['amount'];
        $row['isPending'] = (bool)$row['isPending'];
        $row['isIgnored'] = isset($row['isIgnored']) ? (bool)$row['isIgnored'] : false;
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
        $row['isAuto'] = (bool)$row['isAuto'];
        $data['budgets'][] = $row;
    }


    // Cargar recurring_transactions
    $rows = fetchTable($db, "SELECT * FROM recurring_transactions");
    foreach ($rows as $row) {
        $row['amount'] = (float)$row['amount'];
        $row['isActive'] = (bool)$row['isActive'];
        if ($row['intervalMonths'] !== null) $row['intervalMonths'] = (int)$row['intervalMonths'];
        if ($row['customInterval'] !== null) $row['customInterval'] = (int)$row['customInterval'];
        if ($row['endAfterMonths'] !== null) $row['endAfterMonths'] = (int)$row['endAfterMonths'];
        if ($row['savingsPriority'] !== null) $row['savingsPriority'] = (int)$row['savingsPriority'];
        $data['recurringRules'][] = $row;
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
        if ($row['priority'] !== null) $row['priority'] = (int)$row['priority'];
        $row['isIgnored'] = (bool)$row['isIgnored'];
        $data['savingsGoals'][] = $row;
    }

    // Cargar loans
    $rows = fetchTable($db, "SELECT * FROM loans");
    foreach ($rows as $row) {
        $row['amount'] = (float)$row['amount'];
        $row['installments'] = (int)$row['installments'];
        $row['installmentAmount'] = (float)$row['installmentAmount'];
        $row['setupFee'] = (float)$row['setupFee'];
        $row['isStarted'] = (bool)$row['isStarted'];
        $row['startingPaidAmount'] = (float)$row['startingPaidAmount'];
        if ($row['originalTransactionData'] !== null) {
            $row['originalTransactionData'] = json_decode($row['originalTransactionData'], true);
        }
        $data['loans'][] = $row;
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
        runMigrations($db);

        // Como la app actualmente manda el estado completo (como en localStorage),
        // vaciamos las tablas y las volvemos a llenar. Esto asegura que los elementos
        // eliminados también desaparezcan de la DB.
        // Vaciar las tablas en el orden correcto para respetar las claves foráneas
        $tablesToDelete = [
            'savings_goals',
            'favorites',
            'recurring_transactions',
            'transactions',
            'budgets',
            'categories',
            'loans',
            'accounts',
            'settings'
        ];

        // Intentar desactivar las comprobaciones de claves foráneas por si acaso
        $db->query("SET FOREIGN_KEY_CHECKS = 0");

        foreach ($tablesToDelete as $table) {
            if ($db->query("DELETE FROM $table") === false) {
                throw new Exception("Error al vaciar la tabla $table: " . $db->error);
            }
        }

        // Preparar sentencias (usamos REPLACE INTO por si acaso para evitar conflictos de Primary Key, aunque el DELETE ya debería vaciar)
        $stmtAcc = $db->prepare("REPLACE INTO accounts (id, name, initialBalance, linkedAccountId, logo, excludeFromTotals) VALUES (?, ?, ?, ?, ?, ?)");
        if (!empty($data['accounts'])) {
            foreach ($data['accounts'] as $item) {
                $linkedId = isset($item['linkedAccountId']) ? $item['linkedAccountId'] : null;
                $logo = isset($item['logo']) ? $item['logo'] : null;
                $exclude = !empty($item['excludeFromTotals']) ? 1 : 0;
                $stmtAcc->bind_param("ssdssi", $item['id'], $item['name'], $item['initialBalance'], $linkedId, $logo, $exclude);
                if ($stmtAcc->execute() === false) throw new Exception("Error insertando cuenta: " . $stmtAcc->error);
            }
        }

        $stmtCat = $db->prepare("REPLACE INTO categories (id, name, icon, color, monthlyLimit, customIcon) VALUES (?, ?, ?, ?, ?, ?)");
        if (!empty($data['categories'])) {
            foreach ($data['categories'] as $item) {
                $icon = isset($item['icon']) ? $item['icon'] : null;
                $color = isset($item['color']) ? $item['color'] : null;
                $limit = isset($item['monthlyLimit']) ? $item['monthlyLimit'] : null;
                $cIcon = isset($item['customIcon']) ? $item['customIcon'] : null;
                $stmtCat->bind_param("ssssds", $item['id'], $item['name'], $icon, $color, $limit, $cIcon);
                if ($stmtCat->execute() === false) throw new Exception("Error insertando categoría: " . $stmtCat->error);
            }
        }

        $stmtTx = $db->prepare("INSERT INTO transactions (id, date, amount, category, type, accountId, description, isPending, isIgnored, linkedLoanId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if (!empty($data['transactions'])) {
            foreach ($data['transactions'] as $item) {
                $desc = $item['description'] ?? null;
                $pending = !empty($item['isPending']) ? 1 : 0;
                $ignored = !empty($item['isIgnored']) ? 1 : 0;
                $link = $item['linkedLoanId'] ?? null;
                $stmtTx->bind_param("ssdssssiis", $item['id'], $item['date'], $item['amount'], $item['category'], $item['type'], $item['accountId'], $desc, $pending, $ignored, $link);
                if ($stmtTx->execute() === false) throw new Exception("Error insertando transacción: " . $stmtTx->error);
            }
        }

        $stmtRec = $db->prepare("REPLACE INTO recurring_transactions (id, name, amount, type, category, accountId, frequency, intervalMonths, customInterval, customIntervalUnit, endAfterMonths, startDate, lastGeneratedDate, isActive, savingsPriority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if (!empty($data['recurringRules'])) {
            foreach ($data['recurringRules'] as $item) {
                $intM = isset($item['intervalMonths']) ? $item['intervalMonths'] : null;
                $cInt = isset($item['customInterval']) ? $item['customInterval'] : null;
                $cUnit = isset($item['customIntervalUnit']) ? $item['customIntervalUnit'] : null;
                $endM = isset($item['endAfterMonths']) ? $item['endAfterMonths'] : null;
                $lastD = isset($item['lastGeneratedDate']) ? $item['lastGeneratedDate'] : null;
                $active = isset($item['isActive']) ? (int)$item['isActive'] : 1;
                $sPri = isset($item['savingsPriority']) ? $item['savingsPriority'] : null;
                $stmtRec->bind_param("ssdssssiisisssi", $item['id'], $item['name'], $item['amount'], $item['type'], $item['category'], $item['accountId'], $item['frequency'], $intM, $cInt, $cUnit, $endM, $item['startDate'], $lastD, $active, $sPri);
                if ($stmtRec->execute() === false) throw new Exception("Error insertando automatización: " . $stmtRec->error);
            }
        }

        $stmtBud = $db->prepare("REPLACE INTO budgets (id, category, amount, month, createdAt, isAuto) VALUES (?, ?, ?, ?, ?, ?)");
        if (!empty($data['budgets'])) {
            foreach ($data['budgets'] as $item) {
                $createdAt = isset($item['createdAt']) ? $item['createdAt'] : null;
                $isAuto = !empty($item['isAuto']) ? 1 : 0;
                $stmtBud->bind_param("ssdssi", $item['id'], $item['category'], $item['amount'], $item['month'], $createdAt, $isAuto);
                if ($stmtBud->execute() === false) throw new Exception("Error insertando presupuesto: " . $stmtBud->error);
            }
        }


        $stmtFav = $db->prepare("REPLACE INTO favorites (id, name, amount, category, accountId, description, type, icon, customIcon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if (!empty($data['favorites'])) {
            foreach ($data['favorites'] as $item) {
                $desc = isset($item['description']) ? $item['description'] : null;
                $icon = isset($item['icon']) ? $item['icon'] : null;
                $cIcon = isset($item['customIcon']) ? $item['customIcon'] : null;
                $stmtFav->bind_param("ssdssssss", $item['id'], $item['name'], $item['amount'], $item['category'], $item['accountId'], $desc, $item['type'], $icon, $cIcon);
                if ($stmtFav->execute() === false) throw new Exception("Error insertando favorito: " . $stmtFav->error);
            }
        }

        $stmtSav = $db->prepare("REPLACE INTO savings_goals (id, name, targetAmount, currentAmount, deadline, accountId, color, category, priority, isIgnored) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if (!empty($data['savingsGoals'])) {
            foreach ($data['savingsGoals'] as $item) {
                $dead = isset($item['deadline']) ? $item['deadline'] : null;
                $acc = isset($item['accountId']) ? $item['accountId'] : null;
                $col = isset($item['color']) ? $item['color'] : null;
                $cat = isset($item['category']) ? $item['category'] : null;
                $curr = isset($item['currentAmount']) ? $item['currentAmount'] : 0;
                $pri = isset($item['priority']) ? $item['priority'] : null;
                $ign = !empty($item['isIgnored']) ? 1 : 0;
                $stmtSav->bind_param("ssddssssii", $item['id'], $item['name'], $item['targetAmount'], $curr, $dead, $acc, $col, $cat, $pri, $ign);
                if ($stmtSav->execute() === false) throw new Exception("Error insertando ahorro: " . $stmtSav->error);
            }
        }

        $stmtLoan = $db->prepare("REPLACE INTO loans (id, name, type, amount, installments, installmentAmount, setupFee, startDate, accountId, status, isStarted, startingPaidAmount, originalTransactionData) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if (!empty($data['loans'])) {
            foreach ($data['loans'] as $item) {
                $isStarted = !empty($item['isStarted']) ? 1 : 0;
                $startingPaidAmount = isset($item['startingPaidAmount']) ? $item['startingPaidAmount'] : 0;
                $origTx = isset($item['originalTransactionData']) ? json_encode($item['originalTransactionData']) : null;
                $stmtLoan->bind_param("sssdiddssisds", $item['id'], $item['name'], $item['type'], $item['amount'], $item['installments'], $item['installmentAmount'], $item['setupFee'], $item['startDate'], $item['accountId'], $item['status'], $isStarted, $startingPaidAmount, $origTx);
                if ($stmtLoan->execute() === false) throw new Exception("Error insertando préstamo: " . $stmtLoan->error);
            }
        }

        if (isset($data['alertSettings'])) {
            $stmtSet = $db->prepare("REPLACE INTO settings (setting_key, setting_value) VALUES ('alertSettings', ?)");
            $jsonStr = json_encode($data['alertSettings']);
            $stmtSet->bind_param("s", $jsonStr);
            if ($stmtSet->execute() === false) throw new Exception("Error insertando configuración: " . $stmtSet->error);
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
