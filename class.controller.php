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
    private $logindb;
    private $shitdb;

    private $login_host, $login_port, $login_db, $login_user, $login_pass, $login_table;
    private $shitpost_host, $shitpost_port, $shitpost_db, $shitpost_user, $shitpost_pass, $shitpost_table;

    public function __construct($file = 'db_settings.ini') {
        try {
            if (!$settings = parse_ini_file($file, true)) {
                throw new exception('Unable to open settings file.');
            }
        } catch (Exception $e) {
            $errorCode = 99;
            $this->processError($e->getMessage(), $errorCode);
        }

        $this->login_host = $settings['login']['host'];
        $this->login_port = $settings['login']['port'];
        $this->login_db =  $settings['login']['database'];
        $this->login_user = $settings['login']['user'];
        $this->login_pass = $settings['login']['password'];
        $this->login_table = $settings['login']['table'];

        $this->shitpost_host = $settings['shitpost_db']['host'];
        $this->shitpost_port = $settings['shitpost_db']['port'];
        $this->shitpost_db =  $settings['shitpost_db']['database'];
        $this->shitpost_user = $settings['shitpost_db']['user'];
        $this->shitpost_pass = $settings['shitpost_db']['password'];
        $this->shitpost_table = $settings['shitpost_db']['table'];


        $action = isset($_POST['func']) ? $_POST['func'] : false;
        $connection = $this->perform($action);
        if (!$connection) {
            echo json_encode(array("verified"=>false));
        }
        $logindb = null;
        $shitdb = null;
    }

    private function processError($errorMessage, $errorCode, $fatal=true) {
        $errorArray = array(
            'ErrorCode' => $errorCode,
            'ErrorMessage' => $errorMessage
        );
        file_put_contents('ControllerErrors.txt', $errorMessage, FILE_APPEND);
        $logindb = null;
        $shitdb = null;
        if ($fatal) die(json_encode($errorArray));
    }

    private function generateToken($user) {
        $token = md5($user.$_SERVER['HTTP_X_FORWARDED_FOR']);
        return $token;
    }

    private function verifySession($user) {
        return ($_SESSION['token'] == $this->generateToken($user));
    }

    private function connectToShitpostDB($user) {
        if (!$this->verifySession($user)) {
            unset($_SESSION['token']);
            $_SESSION['valid'] = false;
            return false;
        }
        // Initialise db interface class for the shitpost db
        try {
            $this->shitdb = new shitdb(
                "mysql:host=$this->shitpost_host;dbname=$this->shitpost_db",
                $this->shitpost_user,
                $this->shitpost_pass
            );
        } catch (PDOException $e) {
            $errorCode = 1;
            $this->processError($e->getMessage(), $errorCode);
        }
        return true;
    }

    private function connectToLoginDB() {
        // Initialise db interface class for the user db
        try {
            $this->logindb = new shitdb(
                "mysql:host=$this->login_host;dbname=$this->login_db",
                $this->login_user,
                $this->login_pass
            );
        } catch (PDOException $e) {
            $errorCode = 0;
            $this->processError($e->getMessage(), $errorCode);
        }
    }

    /*--- Shitpost formatting helper functions --- */
    private function make_clickable($text) {
        $regex = '#(^|\s)https?://[^\s()<>]+(?:\([\w\d]+\)|([^[:punct:]\s]|/))#';
        return preg_replace_callback($regex, function ($matches) {
            $returnURL = $matches[0];
            $addSpace = "";
            if ($returnURL[0] == " ") {
                $returnURL = substr($returnURL, 1);
                $addSpace = " ";
            }
            return $addSpace . "<a href=\"{$returnURL}\" target=\"_blank\">{$returnURL}</a>";
        }, $text);
    }

    private function contain_embedded_video($text) {
        $newText = str_replace("<iframe","<div class=\"video-container\"><iframe",$text);
        $newText = str_replace("</iframe>","</iframe></div>",$newText);
        return $newText;
    }

    private function escape_multispace($text) {
        $regex = '#( ){2,}#';
        return preg_replace_callback($regex, function ($matches) {
            $match = $matches[0];
            $newText = '';
            for ($i = 0; $i < strlen($match); $i++) {
                $newText .= '&nbsp;';
            }
            return $newText;
        }, $text);
    }

    /*-------------------------------------------- */

    public function perform($action) {
        try {
            $user = isset($_POST['vars']['user']) ? $_POST['vars']['user'] : false;
            if (!$user) return false;

            switch ($action) {

                /*--- Confirm login credentials ---------------------------------*/
                case 'attemptLogin':
                    $this->connectToLoginDB();

                    // Validate password
                    $pass = isset($_POST['vars']['password']) ? $_POST['vars']['password'] : false;
                    if (!$pass) return false;


                    // Check password against db, return $verified
                    $hash = $this->logindb->select(
                        $this->login_table,
                        "username = \"{$user}\"",
                        "",
                        "password"
                    )[0]['password'];

                    $verified = password_verify($pass,$hash);
                    if (!$verified) return false;

                    // Create session token
                    $_SESSION['token'] = $this->generateToken($user);
                    $_SESSION['valid'] = true;

                    echo json_encode(array("verified"=>true, "user"=>$user));
                    break;
                /*---------------------------------------------------------------*/

                /*--- Change user info ------------------------------------------*/
                case 'changeUserInfo':
                    $this->connectToLoginDB();

                    $newUser = isset($_POST['vars']['newUser']) ? $_POST['vars']['newUser'] : false;

                    //update login db

                    $this->shitdb->update(
                        $this->login_table,
                        "User=\"" . $newUser . "\"",
                        "User=\"" . $user . "\""
                    );
                    break;
                /*---------------------------------------------------------------*/

                /*--- Populate shitpost array from model to pass back to view ---*/
                case 'getShitposts':
                    $connection = $this->connectToShitpostDB($user);
                    if (!$connection) return false;

                    $firstID = (int)$_POST['vars']['lastID'];
                    $page = (int)$_POST['vars']['page'];
                    $postsPerPage = (int)$_POST['vars']['postsPerPage'];
                    $timezone = $_POST['vars']['timezone'];

                    // Count entries
                    $field = "COUNT(*)";
                    $selectUser = ""; // Option to filter results by user, or maybe even date at some point
                    $posts = (int)$this->shitdb->select(
                        $this->shitpost_table,
                        (($selectUser != "") ? "User = \"{$selectUser}\"" : ""),
                        "",
                        $field
                    )[0][$field];

                    // Count total number of pages based on posts per page
                    $postPagesTotal = (int)ceil(($posts / $postsPerPage));
                    $page = (($page != null) && ($page < $postPagesTotal)) ? $page : 0;
                    $lastID = -1;
                    if ($firstID >= 0) {
                        // Get most recently added ID
                        $lastID = (int)$this->shitdb->select(
                            $this->shitpost_table,
                            "",
                            "",
                            "ID",
                            array(
                                "start" => $page * $postsPerPage,
                                "number" => 1
                            ),
                            true
                        )[0]['ID'];
                        $numberOfPosts = ($lastID - $firstID);
                    } else {
                        $numberOfPosts = $postsPerPage;
                    }

                    $viewResultArray = array();
                    if ($numberOfPosts > 0) {
                        // Get results for this page
                        $numberOfPosts = ($numberOfPosts < $postsPerPage) ? $numberOfPosts : $postsPerPage;
                        $resultArray = $this->shitdb->select(
                            $this->shitpost_table,
                            "",
                            "",
                            "*",
                            array(
                                "start" => $page * $postsPerPage,
                                "number" => $numberOfPosts
                            ),
                            true
                        );
                        // Process retrieved results and store in viewResultArray
                        foreach ($resultArray as $result) {
                            $shitID = $result['Id'];

                            $newDate = DateTime::createFromFormat('Y-m-d H:i:s', $result['Date']);
                            $newDate->setTimeZone(new DateTimeZone($timezone));
                            $newDate = $newDate->format('Y-m-d H:i:s');

                            $dateArray = explode(" ", $newDate);
                            $shitDate = $dateArray[0];

                            $shitTime = "@" . $dateArray[1];

                            $shitUser = ($result['User'] != $user) ? $result['User'] : "You";

                            $shitPost = str_replace("\n", "<br>", $result['Shit']);
                            $shitPost = trim($shitPost);
                            $shitPost = $this->make_clickable($shitPost);
                            $shitPost = $this->contain_embedded_video($shitPost);

                            array_push($viewResultArray, array(
                                "shitID" => $shitID,
                                "shitDate" => $shitDate,
                                "shitTime" => $shitTime,
                                "shitUser" => $shitUser,
                                "shitPost" => $shitPost
                            ));
                        }
                    }

                    // Encode results and pass it back to the view in json format
                    $returnVars = array(
                        "verified" => true,
                        "resultsArray" => $viewResultArray,
                        "totalPages" => $postPagesTotal,
                        "page" => $page,
                        "postsPerPage" => $postsPerPage,
                        "lastID" => $lastID
                    );
                    echo json_encode($returnVars);
                    break;
                /*-------------------------------------------------------------*/

                /*--- Format new shitpost, insert into model ------------------*/
                case 'createShitpost':
                    $connection = $this->connectToShitpostDB($user);
                    if (!$connection) return false;

                    // Add new shitpost to db
                    $shitpost = $_POST['vars']['shitpost'];

                    // Shitpost sanitisation will occur here
                    $shitpost = $this->escape_multispace($shitpost);

                    $newEntry = array(
                        "Date" => date('Y-m-d H:i:s'),
                        "User" => $user,
                        "Shit" => $shitpost
                    );
                    $this->shitdb->insert($this->shitpost_table, $newEntry);
                    echo json_encode(array("verified"=>true));
                    break;

                default:
                    throw new Exception('Controller action does not exist!');
                    break;
                /*------------------------------------------------------------*/
            }
        } catch(Exception $e) {
            $errorCode = 10;
            $this->processError($e->getMessage(), $errorCode);
        }
        return true;
    }

}