function attachListener(eventSource, event, callback) {
    if (eventSource !== null && eventSource.addEventListener) {
        eventSource.addEventListener(event, callback);
    } else if (eventSource !== null && eventSource.attachEvent) {
        eventSource.attachEvent(event, callback);
    } else {
        console.error("Event source is null or not supported: " + eventSource + "->" + event);
    }
}
