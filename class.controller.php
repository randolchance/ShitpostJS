<?php
/**
 * Created by PhpStorm.
 * User: dco
 * Date: 2/25/18
 * Time: 6:14 PM
 */
require_once 'class.shitdb.php';

class controller
{
    private $shitdb;

    private $shittable;
    private $logintable;

    public function __construct($dbhost,$dbname,$dbuser,$dbpasswd,$shitdbtable,$logindbtable) {
        $this->shittable = $shitdbtable;
        $this->logintable = $logindbtable;

        // Initialise db interface class
        try {
            $this->shitdb = new shitdb("mysql:host=$dbhost;dbname=$dbname", $dbuser, $dbpasswd);
        } catch (PDOException $e) {
            $errorCode = 0;
            $errorArray = array(
                'Error' => $errorCode,
            );
            file_put_contents('ControllerErrors.txt', $e->getMessage(), FILE_APPEND);
            die($errorArray);
        }

        $action = isset($_POST['func']) ? $_POST['func'] : false;
        $this->perform($action);
    }

    private function make_clickable($text)
    {
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

    public function perform($action) {
        try {
            $user = isset($_POST['vars']['user']) ? $_POST['vars']['user'] : false;
            //$pswd = isset($_POST['password'])?$_POST['password']:false;
            //$token = isset($_POST['token'])?$_POST['token']:false;

            switch ($action) {

                /*--- Confirm login credentials ---------------------------------*/
                case 'attemptLogin':

                    // Validate password
                    break;
                /*---------------------------------------------------------------*/

                /*--- Populate shitpost array from model to pass back to view ---*/
                case 'getShitposts':
                    $page = (int)$_POST['vars']['page'];
                    $postsPerPage = (int)$_POST['vars']['postsPerPage'];

                    // Count entries
                    $field = "COUNT(*)";
                    $selectUser = ""; // Option to filter results by user, or maybe even date at some point
                    $posts = (int)$this->shitdb->select(
                        $this->shittable,
                        (($selectUser != "") ? "User = \"{$selectUser}\"" : ""),
                        "",
                        $field
                    )[0][$field];

                    // Count total number of pages based on posts per page
                    $postPagesTotal = (int)ceil(($posts / $postsPerPage));
                    $page = (int)(($page != null) && ($page < $postPagesTotal)) ? $page : 0;

                    // Get results for this page
                    $resultArray = $this->shitdb->select(
                        $this->shittable,
                        "",
                        "",
                        "*",
                        array(
                            "start" => $page * $postsPerPage,
                            "number" => $postsPerPage
                        ),
                        true
                    );

                    // Process retrieved results and store in viewResultArray
                    $viewResultArray = array();
                    $currentPostDate = '';
                    foreach ($resultArray as $result) {
                        $shitID = $result["Id"];

                        $dateArray = explode(" ", $result["Date"]);
                        $shitDate = ($currentPostDate == $dateArray[0]) ? "" : $currentPostDate = $dateArray[0];
                        $shitDate .= (date('Y-m-d') == $shitDate) ? " (Today)" : "";

                        $shitTime = "@" . $dateArray[1];

                        $shitUser = ($result["User"] != $user) ? $result["User"] : "You";

                        $shitPost = str_replace("\n", "<br>", $result["Shit"]);
                        $shitPost = $this->make_clickable($shitPost);

                        array_push($viewResultArray, array(
                            "shitID" => $shitID,
                            "shitDate" => $shitDate,
                            "shitTime" => $shitTime,
                            "shitUser" => $shitUser,
                            "shitPost" => $shitPost
                        ));
                    }

                    // Encode results and pass it back to the view in json format
                    $returnVars = array(
                        "resultsArray" => $viewResultArray,
                        "totalPages" => $postPagesTotal,
                        "page" => $page
                    );
                    echo json_encode($returnVars);
                    break;
                /*-------------------------------------------------------------*/

                /*--- Format new shitpost, insert into model ------------------*/
                case 'createShitpost':
                    // Add new shitpost to db
                    $shitpost = $_POST['vars']['shitpost'];

                    // Shitpost sanitisation will occur here

                    $newEntry = array(
                        "Date" => date('Y-m-d H:i:s'),
                        "User" => $user,
                        "Shit" => $shitpost
                    );
                    $this->shitdb->insert($this->shittable, $newEntry);
                    break;

                default:
                    throw new Exception('Controller action does not exist!');
                    break;
                /*------------------------------------------------------------*/

            }
        } catch(Exception $e) {
            $errorCode = 1;
            $errorArray = array(
                'Error' => $errorCode,
            );
            file_put_contents('ControllerErrors.txt', $e->getMessage(), FILE_APPEND);
            exit($errorArray);
        }

        $shitdb = null;
    }

}