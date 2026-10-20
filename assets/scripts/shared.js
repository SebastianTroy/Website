function attachListener(eventSource, event, callback) {
    if (eventSource !== null && eventSource.addEventListener) {
        eventSource.addEventListener(event, callback);
    } else if (eventSource !== null && eventSource.attachEvent) {
        eventSource.attachEvent(event, callback);
    } else {
        console.error("Event source is null or not supported: " + eventSource + "->" + event);
    }
}

// The theme is the visitor's choice from the theme toggle, or the OS preference if they haven't used it
const lightSchemeQuery = window.matchMedia("(prefers-color-scheme: light)");

function storedTheme() {
    try {
        return localStorage.getItem("theme");
    } catch {
        return null;
    }
}

function currentTheme() {
    return storedTheme() || (lightSchemeQuery.matches ? "light" : "dark");
}

function applyTheme() {
    let theme = currentTheme();
    document.documentElement.dataset.theme = theme;
    // Light images are picked by a prefers-color-scheme media query, which can't see the toggle
    for (let source of document.querySelectorAll('source[media*="prefers-color-scheme"], source[data-theme-media]')) {
        source.dataset.themeMedia ??= source.media;
        let forLight = source.dataset.themeMedia.includes("light");
        source.media = forLight === (theme === "light") ? "all" : "not all";
    }
    for (let button of document.querySelectorAll(".theme_toggle")) {
        button.title = theme === "light" ? "Switch to the dark theme" : "Switch to the light theme";
        button.setAttribute("aria-label", button.title);
    }
}

// Set the theme straight away, before the page is drawn
applyTheme();
attachListener(lightSchemeQuery, "change", applyTheme);
// Other tabs and iframes, such as the banner, follow a change made with the toggle
attachListener(window, "storage", function (event) {
    if (event.key === "theme" || event.key === null) {
        applyTheme();
    }
});

attachListener(document, "DOMContentLoaded", function () {
    applyTheme();
    for (let button of document.querySelectorAll(".theme_toggle")) {
        attachListener(button, "click", function () {
            let next = currentTheme() === "light" ? "dark" : "light";
            try {
                // Choosing the OS preference forgets the choice, so the OS is followed again
                if (next === (lightSchemeQuery.matches ? "light" : "dark")) {
                    localStorage.removeItem("theme");
                } else {
                    localStorage.setItem("theme", next);
                }
            } catch {
                // Without storage the choice only lasts for this page
                document.documentElement.dataset.theme = next;
                return;
            }
            applyTheme();
        });
    }
});

attachListener(document, "DOMContentLoaded", function () {
    // modify the css to delete the .js_enabled_only class entirely
    for (let stylesheet of document.styleSheets) {
        for (let i = 0; i < stylesheet.cssRules.length; i++) {
            if (stylesheet.cssRules[i].selectorText === ".js_enabled_only") {
                stylesheet.deleteRule(i);
                i--;
            }
        }
    }
    // modify the CSS to add a new rule that hides the .js_disabled_only class
    let style = document.createElement("style");
    document.head.appendChild(style);
    style.sheet.insertRule(".js_disabled_only { display: none !important; }");
});

// Swap each Godot launcher's poster for the game when its play button is clicked
attachListener(document, "DOMContentLoaded", function () {
    for (let launcher of document.querySelectorAll(".godot_launcher")) {
        let button = launcher.querySelector(".godot_launcher_button");
        let source = launcher.dataset.src;
        if (!source) {
            button.disabled = true;
            button.textContent = "Coming Soon";
            continue;
        }
        attachListener(button, "click", function () {
            let iframe = document.createElement("iframe");
            iframe.className = "embedded_godot";
            iframe.title = launcher.dataset.title || "";
            iframe.allowFullscreen = true;
            let theme = storedTheme();
            iframe.src = theme ? source + (source.includes("?") ? "&" : "?") + "theme=" + theme : source;
            launcher.replaceChildren(iframe);
            iframe.focus();
        });
    }
});
