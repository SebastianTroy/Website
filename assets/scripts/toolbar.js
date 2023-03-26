var wasAtTop = true;
var logo;
var toolbar;
var canvasDiv;

function onDomReady() {
    logo = document.querySelector(".toolbar_logo");
    toolbar = document.querySelector(".toolbar");
    canvasDiv = document.querySelector(".background");

    // Enable larger toolbar & logo at top of page
    logo.classList.add("toolbar_logo_bigger");

    // Underline current page on toolbar
    var path = window.location.pathname;
    var buttons = document.querySelectorAll("a.toolbar_button");
    for (var counter = 0; counter < buttons.length; counter++) {
        var button = buttons[counter];
        var buttonPath = button.getAttribute("href");
        if (path === buttonPath) {
            button.classList.add("toolbar_button_current_page");
        }
    }
}

function onScroll() {
    var scrollTop = Math.max(document.body.scrollTop, document.documentElement.scrollTop);

    if (wasAtTop && scrollTop != 0) {
        logo.classList.remove("toolbar_logo_bigger");
        toolbar.classList.add("darker_toolbar");
        wasAtTop = false;
    } else if (!wasAtTop && scrollTop === 0) {
        logo.classList.add("toolbar_logo_bigger");
        toolbar.classList.remove("darker_toolbar");
        wasAtTop = true;
    }
}

if (window.attachEvent) {
    window.attachEvent("DOMContentLoaded", onDomReady);
    window.attachEvent("scroll", onScroll);
} else if (window.addEventListener) {
    window.addEventListener("DOMContentLoaded", onDomReady);
    window.addEventListener("scroll", onScroll);
}
