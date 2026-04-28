<?php
session_start();
session_destroy();

// Delete the remember-me cookie
setcookie('remember', '', time() - 3600, "/");

header('Location: login.php');
exit;
