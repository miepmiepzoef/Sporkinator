<?php
session_start();

// Check if logged in
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    // Check for remember-me cookie
    if (isset($_COOKIE['remember']) && $_COOKIE['remember'] === 'true') {
        $_SESSION['authenticated'] = true;
    } else {
        header('Location: login.php');
        exit;
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>My Private Page</title>
</head>
<body>
    <h1>My Private Page</h1>
    <p>Only you can see this.</p>
    <a href="logout.php">Logout</a>
</body>
</html>


