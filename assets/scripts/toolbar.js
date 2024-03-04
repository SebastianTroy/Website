var wasAtTop = true;
var logo;
var toolbar;

function setupToolbar() {
    logo = document.querySelector(".toolbar_logo");
    toolbar = document.querySelector(".toolbar");

    if (toolbar) {
        // Enable larger toolbar & logo at top of page
        logo.classList.add("toolbar_logo_bigger");

        // Underline current page on toolbar
        let allButtons = document.querySelectorAll(".toolbar_button");
        for (let i = 0; i < allButtons.length; i++) {
            let button = allButtons.item(i);
            let windowHref = window.location.href;

            // detect root page
            if (windowHref.endsWith("/")) {
                windowHref = windowHref + "index.html";
            }

            if (button.href === windowHref) {
                button.classList.add("toolbar_button_current_page");
            }
        }
    }
}

function onScroll() {
    if (toolbar) {
        let scrollTop = Math.max(document.body.scrollTop, document.documentElement.scrollTop);

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
}

attachListener(document, "DOMContentLoaded", setupToolbar);
attachListener(window, "scroll", onScroll);
