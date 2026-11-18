/* ==========================================================================
   rooms.js — games library search/filter and the photo gallery lightbox.
   The filter state (text, genre, platform) is saved in localStorage so the
   list looks the same when the visitor comes back.
   ========================================================================== */

const GAMES = [
    { title: "Counter-Strike 2", genre: "Shooter", platform: "PC" },
    { title: "Valorant", genre: "Shooter", platform: "PC" },
    { title: "Overwatch 2", genre: "Shooter", platform: "PC" },
    { title: "Rainbow Six Siege", genre: "Shooter", platform: "PC" },
    { title: "Marvel Rivals", genre: "Shooter", platform: "PC" },
    { title: "Dota 2", genre: "MOBA", platform: "PC" },
    { title: "League of Legends", genre: "MOBA", platform: "PC" },
    { title: "PUBG: Battlegrounds", genre: "Battle royale", platform: "PC" },
    { title: "Apex Legends", genre: "Battle royale", platform: "PC" },
    { title: "Fortnite", genre: "Battle royale", platform: "PC + PS5" },
    { title: "Call of Duty: Warzone", genre: "Battle royale", platform: "PC + PS5" },
    { title: "Rocket League", genre: "Sports", platform: "PC + PS5" },
    { title: "EA Sports FC 25", genre: "Sports", platform: "PS5" },
    { title: "NBA 2K25", genre: "Sports", platform: "PS5" },
    { title: "Mortal Kombat 1", genre: "Fighting", platform: "PS5" },
    { title: "Tekken 8", genre: "Fighting", platform: "PS5" },
    { title: "Minecraft", genre: "Sandbox", platform: "PC" },
    { title: "Grand Theft Auto V", genre: "Action", platform: "PC + PS5" },
    { title: "Elden Ring", genre: "Action", platform: "PC + PS5" },
    { title: "It Takes Two", genre: "Co-op", platform: "PS5" }
];

const GENRE_ICONS = {
    Shooter: "bi-crosshair",
    MOBA: "bi-diagram-3",
    "Battle royale": "bi-geo-alt",
    Sports: "bi-trophy",
    Fighting: "bi-lightning-charge",
    Sandbox: "bi-boxes",
    Action: "bi-controller",
    "Co-op": "bi-people"
};

(function initGameFilter() {
    const list = document.getElementById("gameList");
    if (!list) return;

    const search = document.getElementById("gameSearch");
    const platform = document.getElementById("gamePlatform");
    const chipsBox = document.getElementById("genreChips");
    const count = document.getElementById("gameCount");
    const resetBtn = document.getElementById("gameReset");
    const KEY = "fg_game_filter";

    const state = Store.get(KEY, { text: "", genre: "All", platform: "all" });

    // Build genre chips from the data
    ["All", ...new Set(GAMES.map(g => g.genre))].forEach(genre => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.textContent = genre;
        chip.dataset.genre = genre;
        chipsBox.appendChild(chip);
    });

    function render() {
        const text = state.text.trim().toLowerCase();
        const results = GAMES.filter(game =>
            (state.genre === "All" || game.genre === state.genre) &&
            (state.platform === "all" || game.platform.includes(state.platform)) &&
            (!text || game.title.toLowerCase().includes(text) || game.genre.toLowerCase().includes(text))
        );

        chipsBox.querySelectorAll(".chip").forEach(chip =>
            chip.setAttribute("aria-pressed", String(chip.dataset.genre === state.genre)));

        count.textContent = `${results.length} of ${GAMES.length} games`;

        if (!results.length) {
            list.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
                <i class="bi bi-search" aria-hidden="true"></i>
                Nothing matches "${escapeHTML(state.text)}". Try another title or clear the filters.</div>`;
        } else {
            list.innerHTML = results.map(game => `
                <div class="game-item">
                    <span class="game-icon"><i class="bi ${GENRE_ICONS[game.genre] || "bi-controller"}" aria-hidden="true"></i></span>
                    <div><strong>${escapeHTML(game.title)}</strong><span>${game.genre}, ${game.platform}</span></div>
                </div>`).join("");
        }
        Store.set(KEY, state);
    }

    search.value = state.text;
    platform.value = state.platform;

    search.addEventListener("input", () => { state.text = search.value; render(); });
    platform.addEventListener("change", () => { state.platform = platform.value; render(); });
    chipsBox.addEventListener("click", e => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        state.genre = chip.dataset.genre;
        render();
    });
    resetBtn.addEventListener("click", () => {
        Object.assign(state, { text: "", genre: "All", platform: "all" });
        search.value = "";
        platform.value = "all";
        render();
        search.focus();
    });

    render();
})();

(function initGallery() {
    const gallery = document.getElementById("gallery");
    if (!gallery) return;
    const image = document.getElementById("lightboxImg");
    const caption = document.getElementById("lightboxCaption");

    gallery.addEventListener("click", e => {
        const button = e.target.closest("button");
        if (!button) return;
        const thumb = button.querySelector("img");
        image.src = thumb.src;
        image.alt = thumb.alt;
        caption.textContent = thumb.alt;
        Modal.open("lightbox");
    });
})();
