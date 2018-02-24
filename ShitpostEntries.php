<?php
/**
 * Created by PhpStorm.
 * User: dco
 * Date: 2/12/18
 * Time: 10:19 AM
 */

require_once 'class.shitdb.php';


function make_clickable($text) {
    $regex = '#(^|\s)https?://[^\s()<>]+(?:\([\w\d]+\)|([^[:punct:]\s]|/))#';
    return preg_replace_callback($regex, function ($matches) {
        $returnURL = $matches[0];
        $addSpace = "";
        if ($returnURL[0] == " ") {
            $returnURL = substr($returnURL, 1);
            $addSpace = " ";
        }
        return $addSpace . "<a href=\'{$returnURL}\'>{$returnURL}</a>";
    }, $text);
}


require_once 'ShitpostDB.php';

// Collect post data from Shitpost.js
$user = $_POST["user"];
$postsPerPage = (int) $_POST["postsPerPage"];

    // Count entries
$field = "COUNT(*)";
$selectUser = ""; // Option to filter results by user, or maybe even date at some point
$posts = (int) $shitdb->select(
    $shittable,
    (($selectUser != "") ? "User = \"{$selectUser}\"" : ""),
    "",
    $field
)[0][$field];

    // Count total number of pages based on posts per page
$postPagesTotal = (int) ceil(($posts / $postsPerPage));
$page = (int) (($_POST["page"] != NULL) && ($_POST["page"] < $postPagesTotal)) ? $_POST["page"] : 0;

    // Get results for this page
$resultArray = $shitdb->select(
    $shittable,
    "",
    "",
    "*",
    array(
        "start" => $page*$postsPerPage,
        "number" => $postsPerPage
    ),
    true
);

    // Process retrieved results and store in viewResultArray
$viewResultArray = array();
$currentPostDate = '';
foreach($resultArray as $result) {
    $shitID = $result["Id"];

    $dateArray = explode(" ", $result["Date"]);
    $shitDate = ($currentPostDate == $dateArray[0]) ? "" : $currentPostDate = $dateArray[0];
    $shitDate .= (date('Y-m-d') == $shitDate) ? " (Today)" : "";

    $shitTime = "@" . $dateArray[1];

    $shitUser = ($result["User"] != $user) ? $result["User"] : "You";

    $shitPost = str_replace("\n","<br>",$result["Shit"]);
    $shitPost = make_clickable($shitPost);

    array_push($viewResultArray, array(
        "shitID" => $shitID,
        "shitDate" => $shitDate,
        "shitTime" => $shitTime,
        "shitUser" => $shitUser,
        "shitPost" => $shitPost
    ));
}

// Encode results and pass it back to the Shitpost.js in json format
$returnVars = array(
    "resultsArray" => $viewResultArray,
    "totalPages" => $postPagesTotal,
    "page" => $page
);
echo json_encode($returnVars);

?>