// Only do this if javascript is enabled, otherwise we'll just have a big empty space
function insertHeaderWidget() {
    let content = document.querySelector(".content");
    let widget = document.createElement("div");
    let iframe = document.createElement("iframe");
    iframe.id = "header_widget";
    iframe.src = "widget-slideshow.html";
    widget.appendChild(iframe);
    content.parentNode.insertBefore(widget, content);
}

attachListener(document, "DOMContentLoaded", insertHeaderWidget);
