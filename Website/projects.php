<?php

$PageTitle = "Projects";

function customPageHeader(){
?>
<link rel="stylesheet" type="text/css" href="css/basic_style.css">
<link rel="stylesheet" type="text/css" href="css/content_box.css">
<?php }

	include_once ('common/header.php');

	include_once ('html/projects.html');

	include_once ('common/footer.php');
?>