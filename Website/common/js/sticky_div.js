// This function will be executed when the user scrolls the page.
$(window).scroll(
	function(e) {
	    // Get the position of the location where the scroller starts.
	    var scroller_anchor = $(".nav_menu_anchor").offset().top;

	    /*
	     * If the user has scrolled past the origional location sticky div,
	     * stick it to the top of the screen. Only happens the first time.
	     */
	    if ($(this).scrollTop() >= scroller_anchor
		    && $('.nav_menu').css('position') != 'fixed') {
		
		// Change the CSS of the scroller to highlight it and fix it at
		// the top of the screen.
		$('.nav_menu').css({
		    'position' : 'fixed',
		    'top' : '0px'
		});
		$('.nav_button').css({
		    'position' : 'fixed',
		    'top' : '0px'
		});
		/*
		 * 
		 */
		$('.nav_menu_anchor').css('height', 1.5 * $('.nav_menu').height());
	    } else if ($(this).scrollTop() < scroller_anchor + 0.5 * $('.nav_menu').height()
		    && $('.nav_menu').css('position') != 'relative') {
		// If the user has scrolled back to the location above the
		// scroller anchor place it back into the content.

		// Change the height of the scroller anchor to 0 and now we will
		// be adding the scroller back to the content.
		$('.nav_menu_anchor').css('height', '0px');

		// Change the CSS and put it back to its original position.
		$('.nav_menu').css({
		    'position' : 'relative'
		});
		$('.nav_button').css({
		    'position' : 'relative'
		});
	    }
	});