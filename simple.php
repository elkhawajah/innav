<?php

$DATA_FOLDER = 'json/';
$FILE_NAME = 'test_user_s.json';
$DATA = json_encode($_POST['data']);

$fp = fopen($DATA_FOLDER.$FILE_NAME, 'w');
fwrite($fp, $DATA);
fclose($fp);

?>