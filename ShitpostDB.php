<?php
/**
 * Created by PhpStorm.
 * User: dco
 * Date: 2/23/18
 * Time: 8:32 AM
 */
$dbhost = "localhost";
$dbname = "shitdb";
$dbuser = "root";
$dbpasswd = "abcdefgh";

$shittable = "shit_table";
$logintable = "login_table";
$shitdb = new shitdb("mysql:host=$dbhost;dbname=$dbname", $dbuser, $dbpasswd);
?>