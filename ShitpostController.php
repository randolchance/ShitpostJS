<?php
/**
 * Created by PhpStorm.
 * User: dco
 * Date: 2/23/18
 * Time: 8:32 AM
 */

require_once 'class.controller.php';

$ShitpostController = new controller(
    'localhost',
    'shitdb',
    'root',
    'abcdefgh',
    'shit_table',
    'login_table'
);
