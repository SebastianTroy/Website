<!doctype html>
<html lang="en">
  <head>
  	<!-- This block optimises the rendering of the page on IE browsers -->
  	<?php
	if (isset($_SERVER['HTTP_USER_AGENT']) && (strpos($_SERVER['HTTP_USER_AGENT'], 'MSIE') !== false))
		header('X-UA-Compatible: IE=edge,chrome=1');
 	?>
	<!-- This block deals with page details -->
	 <title><?= isset($PageTitle) ? $PageTitle : "TrojanDev" ?></title>

     <meta name="description" content="text/html; charset=UTF-8">
	 <meta name="author" content="Sebastian Troy">
	 <meta name="viewport" content="width=device-width; initial-scale=1.0">
   
    <!-- Additional tags here -->
    <?php
	if (function_exists('customPageHeader')) {
		customPageHeader();
	}
	?>
	
			<!-- icons for webpage -->
		<link rel="shortcut icon" href="common/img/logo.ico">
		<link rel="apple-touch-icon" href="img/logo.ico">

		<!-- stylesheets required for floating menu -->
		<link rel="stylesheet" type="text/css" href="common/css/header_footer.css">
		<link rel="stylesheet" type="text/css" href="common/css/sticky_div.css">
		<link rel="stylesheet" type="text/css" href="common/css/nav_menu.css">


		<!-- link libraries used in header -->
		<script src="common/js/libs/jquery-1.10.2.min.js" type="text/javascript"></script>

		<!-- javascript file required for floating menu -->
		<script src="common/js/sticky_div.js" type="text/javascript"></script>

	
	<!-- Google analytics script -->
			<script>
				(function(i, s, o, g, r, a, m) {
					i['GoogleAnalyticsObject'] = r;
					i[r] = i[r] ||
					function() {
						(i[r].q = i[r].q || []).push(arguments)
					}, i[r].l = 1 * new Date();
					a = s.createElement(o), m = s.getElementsByTagName(o)[0];
					a.async = 1;
					a.src = g;
					m.parentNode.insertBefore(a, m)
				})(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');

				ga('create', 'UA-43714244-1', 'dropboxusercontent.com');
				ga('send', 'pageview');
		</script>
  </head>

<!-- This block creates a floating/sticky menu bar at the top of the page -->
	<body>
		<div id="master_container">
			<div id="header_container">
				<h1>Title</h1>
				<div class="nav_menu_container">
					<div class="nav_menu_anchor"></div>
					<div class="nav_menu">
						<ul class="nav_menu_buttons">
							<li>
								<span class="nav_button"><span class="left"><span class="right"><a href="index.php"><span class="left">Home</span></a></span></span></span>
							</li>
							<li>
								<span class="nav_button"><span class="left"><span class="right"><a href="docs.php"><span class="left">Docs</span></a></span></span></span>
							</li>
							<li>
								<span class="nav_button"><span class="left"><span class="right"><a href="#"><span class="left">Lorem</span></a></span></span></span>
							</li>
							<li>
								<span class="nav_button"><span class="left"><span class="right"><a href="#"><span class="left">Ipsum</span></a></span></span></span>
							</li>
							<li>
								<span class="nav_button"><span class="left"><span class="right"><a href="#"><span class="left">Another</span></a></span></span></span>
							</li>
						</ul>
					</div>
				</div>
			</div>