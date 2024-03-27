function attachListener(eventSource, event, callback) {
    if (eventSource !== null && eventSource.addEventListener) {
        eventSource.addEventListener(event, callback);
    } else if (eventSource !== null && eventSource.attachEvent) {
        eventSource.attachEvent(event, callback);
    } else {
        console.error("Event source is null or not supported: " + eventSource + "->" + event);
    }
}

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
    style.sheet.insertRule(".js_disabled_only { display: none; }");
});
