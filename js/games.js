/* ==========================================================================
   games.js — Game deals page, powered by the public CheapShark API
   (https://apidocs.cheapshark.com, no key needed).

   - fetch() with async/await, loading skeletons and error handling
   - search form with custom validation
   - last search + recent searches saved in localStorage
   - heart button saves a deal to the visitor's list (shown on the profile)
   ========================================================================== */

(function () {
    const API = "https://www.cheapshark.com/api/1.0";
    const grid = document.getElementById("dealsGrid");
    if (!grid) return;

    const form = document.getElementById("dealForm");
    const queryInput = document.getElementById("dealQuery");
    const sortSelect = document.getElementById("dealSort");
    const priceSelect = document.getElementById("dealPrice");
    const status = document.getElementById("dealStatus");
    const recentBox = document.getElementById("recentSearches");
    const viewChips = document.getElementById("dealView");
    const SEARCH_KEY = "fg_deal_search";
    const RECENT_KEY = "fg_deal_recent";

    let stores = {};
    let currentView = "all";

    /* ---- Store names (cached for a day) ---- */
    async function loadStores() {
        const cached = Store.get("fg_stores");
        if (cached && Date.now() - cached.time < 86400000) {
            stores = cached.map;
            return;
        }
        try {
            const response = await fetch(`${API}/stores`);
            if (!response.ok) throw new Error(response.status);
            const data = await response.json();
            stores = Object.fromEntries(data.map(s => [s.storeID, s.storeName]));
            Store.set("fg_stores", { time: Date.now(), map: stores });
        } catch (e) {
            stores = {}; // names are optional: cards fall back to "Store #id"
        }
    }

    /* ---- UI states ---- */
    function showLoading() {
        status.innerHTML = "";
        grid.setAttribute("aria-busy", "true");
        grid.innerHTML = Array.from({ length: 8 }, () => `<div class="skeleton" aria-hidden="true"></div>`).join("");
    }

    function showError(message) {
        grid.removeAttribute("aria-busy");
        grid.innerHTML = "";
        status.innerHTML = `
            <div class="status-msg err" role="alert">
                <i class="bi bi-wifi-off" aria-hidden="true"></i>
                <span>${escapeHTML(message)}</span>
                <button type="button" class="btn btn-sm btn-ghost" id="retryBtn" style="margin-left:auto">Try again</button>
            </div>`;
        document.getElementById("retryBtn").addEventListener("click", search);
    }

    function steamImage(deal) {
        return deal.steamAppID
            ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${deal.steamAppID}/header.jpg`
            : deal.thumb;
    }

    function dealCard(deal, index) {
        const off = Math.round(Number(deal.savings));
        const saved = Wishlist.has(deal.dealID);
        const storeName = stores[deal.storeID] || `Store #${deal.storeID}`;
        const rating = deal.steamRatingText ? `<span><i class="bi bi-hand-thumbs-up" aria-hidden="true"></i> ${escapeHTML(deal.steamRatingText)}</span>` : "";
        return `
            <article class="deal" style="animation-delay:${index * 40}ms">
                <div class="deal-media">
                    <img src="${steamImage(deal)}" alt="${escapeHTML(deal.title)} cover" loading="lazy"
                         onerror="this.onerror=null;this.src='${deal.thumb}'">
                    ${off > 0 ? `<span class="deal-off">-${off}%</span>` : ""}
                </div>
                <div class="deal-body">
                    <h3>${escapeHTML(deal.title)}</h3>
                    <div class="deal-meta">
                        <span><i class="bi bi-shop" aria-hidden="true"></i> ${escapeHTML(storeName)}</span>
                        ${rating}
                    </div>
                    <div class="deal-prices">
                        <strong>$${deal.salePrice}</strong>
                        ${off > 0 ? `<s>$${deal.normalPrice}</s>` : ""}
                    </div>
                    <div class="deal-actions">
                        <a class="btn btn-primary btn-sm" href="https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(deal.dealID)}" target="_blank" rel="noopener">
                            View deal <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
                        </a>
                        <button type="button" class="btn btn-ghost btn-sm save-btn" data-deal="${escapeHTML(deal.dealID)}"
                                aria-pressed="${saved}" aria-label="${saved ? "Remove from" : "Save to"} my games">
                            <i class="bi ${saved ? "bi-heart-fill" : "bi-heart"}" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
            </article>`;
    }

    let lastResults = [];

    function render(deals) {
        grid.removeAttribute("aria-busy");
        lastResults = deals;
        if (!deals.length) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
                <i class="bi bi-controller" aria-hidden="true"></i>
                ${currentView === "saved"
                    ? "You haven't saved any games yet. Tap the heart on a deal to keep it here."
                    : "No deals found. Try a shorter title or raise the price limit."}</div>`;
            return;
        }
        grid.innerHTML = deals.map(dealCard).join("");
    }

    /* ---- Recent searches ---- */
    function renderRecent() {
        const recent = Store.get(RECENT_KEY, []);
        recentBox.innerHTML = recent.length
            ? `<span class="muted small">Recent:</span>` + recent.map(q => `<button type="button" class="chip" data-q="${escapeHTML(q)}">${escapeHTML(q)}</button>`).join("") +
              `<button type="button" class="chip" id="clearRecent" aria-label="Clear recent searches"><i class="bi bi-x" aria-hidden="true"></i> Clear</button>`
            : "";
    }

    function rememberQuery(q) {
        if (!q) return;
        const recent = Store.get(RECENT_KEY, []).filter(item => item.toLowerCase() !== q.toLowerCase());
        recent.unshift(q);
        Store.set(RECENT_KEY, recent.slice(0, 5));
        renderRecent();
    }

    /* ---- Main request ---- */
    async function search() {
        setView("all");
        const q = queryInput.value.trim();
        const params = new URLSearchParams({ pageSize: "16", sortBy: sortSelect.value, onSale: "1" });
        if (q) params.set("title", q);
        if (priceSelect.value !== "any") params.set("upperPrice", priceSelect.value);

        Store.set(SEARCH_KEY, { q, sort: sortSelect.value, price: priceSelect.value });
        rememberQuery(q);
        showLoading();

        try {
            const response = await fetch(`${API}/deals?${params}`);
            if (response.status === 429) throw new Error("Too many requests right now. Wait a few seconds and try again.");
            if (!response.ok) throw new Error(`The deals service answered with error ${response.status}.`);
            const deals = await response.json();
            status.innerHTML = `<div class="status-msg info"><i class="bi bi-info-circle" aria-hidden="true"></i>
                <span>${deals.length} deals ${q ? `for "${escapeHTML(q)}"` : "on sale now"}. Prices in USD, updated live from CheapShark.</span></div>`;
            render(deals);
        } catch (error) {
            const offline = error instanceof TypeError; // fetch throws TypeError when there is no connection
            showError(offline ? "Couldn't reach the deals service. Check your internet connection." : error.message);
        }
    }

    /* ---- All deals / saved toggle ---- */
    function setView(view) {
        currentView = view;
        viewChips.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", String(c.dataset.view === view)));
    }

    viewChips.addEventListener("click", e => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        if (chip.dataset.view === "saved") {
            setView("saved");
            status.innerHTML = "";
            render(Wishlist.all());
        } else {
            search();
        }
    });

    grid.addEventListener("click", e => {
        const button = e.target.closest(".save-btn");
        if (!button) return;
        const id = button.dataset.deal;
        const deal = lastResults.find(d => d.dealID === id) || Wishlist.all().find(d => d.dealID === id);
        const keep = {
            dealID: deal.dealID, title: deal.title, salePrice: deal.salePrice, normalPrice: deal.normalPrice,
            savings: deal.savings, thumb: deal.thumb, steamAppID: deal.steamAppID, storeID: deal.storeID,
            steamRatingText: deal.steamRatingText
        };
        const nowSaved = Wishlist.toggle(keep);
        button.setAttribute("aria-pressed", String(nowSaved));
        button.setAttribute("aria-label", `${nowSaved ? "Remove from" : "Save to"} my games`);
        button.querySelector("i").className = `bi ${nowSaved ? "bi-heart-fill" : "bi-heart"}`;
        toast(nowSaved ? `${deal.title} saved to your games.` : `${deal.title} removed.`);
        if (currentView === "saved") render(Wishlist.all());
    });

    recentBox.addEventListener("click", e => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        if (chip.id === "clearRecent") {
            Store.remove(RECENT_KEY);
            renderRecent();
            return;
        }
        queryInput.value = chip.dataset.q;
        search();
    });

    // Search form: the title is optional, but if given it must be 2–60 characters
    Validator.attach(form, { dealQuery: [["minLength", 2], ["maxLength", 60]] }, search);
    sortSelect.addEventListener("change", search);
    priceSelect.addEventListener("change", search);

    /* ---- Start: restore last search ---- */
    const saved = Store.get(SEARCH_KEY);
    if (saved) {
        queryInput.value = saved.q || "";
        sortSelect.value = saved.sort || "Deal Rating";
        priceSelect.value = saved.price || "any";
    }
    renderRecent();
    showLoading();
    loadStores().then(search);
})();
