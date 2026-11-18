/* ==========================================================================
   profile.js — shows the logged-in user's stored details, bookings and saved
   games; lets them edit details, log out or delete the account.
   Visitors who are not logged in are redirected to the login page.
   ========================================================================== */

(function () {
    const root = document.getElementById("profileRoot");
    if (!root) return;

    let user = Auth.current();
    if (!user) {
        window.location.replace("login.html?next=profile");
        return;
    }

    const $ = id => document.getElementById(id);

    function formatDate(iso) {
        return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    }

    /* ---- Details card ---- */
    function renderDetails() {
        $("pfAvatar").textContent = initials(user.name);
        $("pfName").textContent = user.name;
        $("pfZoneBadge").textContent = `Favourite: ${ZONES[user.zone] ? ZONES[user.zone].name : "not set"}`;
        $("pfEmail").textContent = user.email;
        $("pfPhone").textContent = user.phone;
        $("pfSince").textContent = formatDate(user.createdAt);
        $("pfPassword").textContent = "•".repeat(user.password.length);
        $("pfPassword").dataset.hidden = "1";
        $("greeting").textContent = `Hi, ${user.name.split(" ")[0]}`;
    }

    $("pfShowPass").addEventListener("click", function () {
        const field = $("pfPassword");
        const hidden = field.dataset.hidden === "1";
        field.textContent = hidden ? user.password : "•".repeat(user.password.length);
        field.dataset.hidden = hidden ? "0" : "1";
        this.querySelector("i").className = hidden ? "bi bi-eye-slash" : "bi bi-eye";
        this.setAttribute("aria-label", hidden ? "Hide password" : "Show password");
    });

    /* ---- Tabs ---- */
    const tabs = [...document.querySelectorAll(".tab")];
    function selectTab(tab) {
        tabs.forEach(t => {
            const active = t === tab;
            t.setAttribute("aria-selected", String(active));
            t.tabIndex = active ? 0 : -1;
            $(t.getAttribute("aria-controls")).hidden = !active;
        });
    }
    tabs.forEach((tab, i) => {
        tab.addEventListener("click", () => selectTab(tab));
        tab.addEventListener("keydown", e => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
                next.focus();
                selectTab(next);
            }
        });
    });

    /* ---- Bookings ---- */
    function renderBookings() {
        const list = Bookings.forEmail(user.email);
        $("bookingCount").textContent = list.length;
        $("statSpent").textContent = formatKZT(list.reduce((sum, b) => sum + b.total, 0));
        $("statHours").textContent = list.reduce((sum, b) => sum + Number(b.hours), 0) + " h";
        $("bookingList").innerHTML = list.length
            ? list.map(b => `
                <div class="booking-row">
                    <div>
                        <strong>${ZONES[b.zone].name}, ${b.type === "night" ? "night package" : b.hours + " h"}</strong>
                        <span>${formatDate(b.date)} at ${b.time}. ${formatKZT(b.total)}</span>
                    </div>
                    <button type="button" class="btn btn-danger btn-sm" data-cancel="${b.id}">
                        <i class="bi bi-x-circle" aria-hidden="true"></i> Cancel
                    </button>
                </div>`).join("")
            : `<div class="empty-state"><i class="bi bi-calendar-plus" aria-hidden="true"></i>
                No bookings yet. <a href="rooms.html">Choose a room</a> and book your first session.</div>`;
    }

    $("bookingList").addEventListener("click", e => {
        const button = e.target.closest("[data-cancel]");
        if (!button) return;
        Bookings.cancel(button.dataset.cancel);
        renderBookings();
        toast("Booking cancelled.");
    });

    /* ---- Saved games ---- */
    function renderSaved() {
        const list = user.wishlist || [];
        $("savedCount").textContent = list.length;
        $("savedList").innerHTML = list.length
            ? list.map(d => `
                <div class="booking-row">
                    <div>
                        <strong>${escapeHTML(d.title)}</strong>
                        <span>$${d.salePrice}${Number(d.savings) > 0 ? `, was $${d.normalPrice}` : ""}</span>
                    </div>
                    <div style="display:flex;gap:.5rem">
                        <a class="btn btn-ghost btn-sm" href="https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(d.dealID)}" target="_blank" rel="noopener">View deal</a>
                        <button type="button" class="btn btn-danger btn-sm" data-unsave="${escapeHTML(d.dealID)}" aria-label="Remove ${escapeHTML(d.title)}"><i class="bi bi-trash" aria-hidden="true"></i></button>
                    </div>
                </div>`).join("")
            : `<div class="empty-state"><i class="bi bi-heart" aria-hidden="true"></i>
                Nothing saved yet. Find a game on <a href="games.html">Game deals</a> and tap the heart.</div>`;
    }

    $("savedList").addEventListener("click", e => {
        const button = e.target.closest("[data-unsave]");
        if (!button) return;
        user = Auth.update(user.email, { wishlist: user.wishlist.filter(d => d.dealID !== button.dataset.unsave) });
        renderSaved();
        toast("Removed from your games.");
    });

    /* ---- Edit details ---- */
    const editForm = $("editForm");
    function fillEditForm() {
        $("edName").value = user.name;
        $("edPhone").value = user.phone;
        $("edZone").value = user.zone;
        $("edPassword").value = "";
        $("edConfirm").value = "";
    }

    initPasswordReveal();

    Validator.attach(editForm, {
        edName: ["required", "name"],
        edPhone: ["required", "phone"],
        edZone: ["required"],
        edPassword: ["password"],               // optional: only checked when filled
        edConfirm: [["match", "edPassword"]]
    }, () => {
        if ($("edPassword").value && !$("edConfirm").value) {
            Validator.showError($("edConfirm"), "Repeat the new password.");
            $("edConfirm").focus();
            return;
        }
        const changes = {
            name: $("edName").value.trim(),
            phone: $("edPhone").value.trim(),
            zone: $("edZone").value
        };
        if ($("edPassword").value) changes.password = $("edPassword").value;
        user = Auth.update(user.email, changes);
        renderDetails();
        renderAuthSlot();
        fillEditForm();
        editForm.querySelectorAll(".is-valid").forEach(el => el.classList.remove("is-valid"));
        toast("Profile updated.");
    });

    // When a new password is typed, the confirmation becomes required
    $("edPassword").addEventListener("input", () => {
        if ($("edConfirm").value || $("edConfirm").dataset.touched) {
            Validator.validateField($("edConfirm"), [["match", "edPassword"]]);
        }
    });

    /* ---- Log out & delete ---- */
    $("logoutBtn").addEventListener("click", () => {
        Auth.logout();
        window.location.href = "login.html";
    });
    $("deleteBtn").addEventListener("click", () => Modal.open("deleteModal"));
    $("confirmDelete").addEventListener("click", () => {
        Auth.remove(user.email);
        window.location.href = "index.html";
    });

    renderDetails();
    renderBookings();
    renderSaved();
    fillEditForm();
})();
