<?php
session_start();

// If already logged in, go to private page
if (isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true) {
    header('Location: private.php');
    exit;
}

// Handle login form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = $_POST['password'] ?? '';
    $rememberMe = isset($_POST['rememberMe']);
    
    // Hardcoded password – change this!
    if ($password === 'yourSecret123') {
        $_SESSION['authenticated'] = true;
        
        if ($rememberMe) {
            // Cookie lasts 30 days
            setcookie('remember', 'true', time() + (86400 * 30), "/");
            // Extend session cookie lifetime
            ini_set('session.cookie_lifetime', 86400 * 30);
        } else {
            // Session cookie expires when browser closes
            ini_set('session.cookie_lifetime', 0);
        }
        
        header('Location: private.php');
        exit;
    } else {
        $error = "Wrong password.";
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Login</title>
</head>
<body>
    <h2>Login</h2>
    <?php if (isset($error)) echo "<p style='color:red'>$error</p>"; ?>
    <form method="post">
        <input type="password" name="password" placeholder="Enter password" required>
        <label>
            <input type="checkbox" name="rememberMe"> Remember me
        </label>
        <br><br>
        <button type="submit">Login</button>
    </form>
</body>
</html>
