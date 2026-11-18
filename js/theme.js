/* Runs in <head> before the page is painted, so the saved theme never flashes.
   The toggle button itself is wired up in script.js. */
(function () {
    var theme = null;
    try {
        theme = JSON.parse(localStorage.getItem("fg_theme"));
    } catch (e) { /* storage blocked or bad value: fall through */ }

    if (theme !== "light" && theme !== "dark") {
        theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    document.documentElement.setAttribute("data-theme", theme);
})();
