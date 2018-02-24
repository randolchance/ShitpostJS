<?php
/**
 * Created by PhpStorm.
 * User: dco
 * Date: 2/12/18
 * Time: 10:19 AM
 */


require_once 'class.shitdb.php';

require_once  'ShitpostDB.php';

$user = $_POST["user"];
$shitpost = $_POST["shitpost"];


// Insert shitpost into the DB under user

$newEntry = array(
    "Date" => date('Y-m-d H:i:s'),
    "User" => $user,
    "Shit" => $shitpost
);
$shitdb->insert($shittable, $newEntry);
echo json_encode($newEntry);

?>