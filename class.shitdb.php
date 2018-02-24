<?php
require_once 'class.db.php';

class shitdb extends db {
    public function select($table, $where="", $bind="", $fields="*", $limit=[], $desc=false) {
        $sql = "SELECT " . $fields . " FROM " . $table;
        if(!empty($where))
            $sql .= " WHERE " . $where;
        if($desc)
            $sql .= " ORDER BY id DESC";
        if(!empty($limit))
            $sql .= " LIMIT {$limit["start"]}, {$limit["number"]}";
        $sql .= ";";
        return $this->run($sql, $bind);
    }
}
?>