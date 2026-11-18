/* ==========================================================================
   pricing.js — hourly / night switch on the plan cards and the session
   cost calculator. The chosen mode is remembered in localStorage.
   ========================================================================== */

(function initPlans() {
    const switcher = document.getElementById("billingSwitch");
    if (!switcher) return;
    const KEY = "fg_price_mode";

    function render(mode) {
        switcher.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
        document.querySelectorAll(".plan[data-zone]").forEach(plan => {
            const zone = ZONES[plan.dataset.zone];
            const amount = plan.querySelector(".amount");
            const unit = plan.querySelector(".unit");
            amount.classList.add("flip");
            setTimeout(() => {
                amount.textContent = formatKZT(mode === "night" ? zone.night : zone.hour);
                unit.textContent = mode === "night" ? "/ night, 22:00 to 08:00" : "/ hour";
                amount.classList.remove("flip");
            }, 180);
        });
        Store.set(KEY, mode);
    }

    switcher.addEventListener("click", e => {
        const button = e.target.closest("button");
        if (button) render(button.dataset.mode);
    });
    render(Store.get(KEY, "hour"));
})();

(function initCalculator() {
    const form = document.getElementById("calcForm");
    if (!form) return;

    const zone = document.getElementById("calcZone");
    const type = document.getElementById("calcType");
    const hoursOut = document.getElementById("calcHours");
    const hoursField = document.getElementById("calcHoursField");
    const total = document.getElementById("calcTotal");
    const note = document.getElementById("calcNote");
    let hours = 3;

    function update() {
        const isMember = Boolean(Auth.current());
        const isNight = type.value === "night";
        hoursField.hidden = isNight;
        hoursOut.textContent = `${hours} h`;
        const price = sessionPrice(zone.value, type.value, hours, isMember);
        const regular = sessionPrice(zone.value, type.value, hours, false);
        total.textContent = formatKZT(price);
        note.textContent = isMember
            ? `Member price. You save ${formatKZT(regular - price)}.`
            : `Members pay ${formatKZT(regular * (1 - MEMBER_DISCOUNT))}. Create an account to save 10%.`;

        // Night package is cheaper than 10+ hours: tell the visitor
        const hourlyFor10 = ZONES[zone.value].hour * 10;
        if (!isNight && hours >= 5) {
            note.textContent += ` Tip: the night package costs ${formatKZT(ZONES[zone.value].night)} for 10 hours.`;
        } else if (isNight) {
            note.textContent += ` That is ${formatKZT(hourlyFor10 - ZONES[zone.value].night)} less than 10 hourly sessions.`;
        }
    }

    document.getElementById("calcMinus").addEventListener("click", () => { hours = Math.max(1, hours - 1); update(); });
    document.getElementById("calcPlus").addEventListener("click", () => { hours = Math.min(12, hours + 1); update(); });
    zone.addEventListener("change", update);
    type.addEventListener("change", update);
    form.addEventListener("submit", e => e.preventDefault());

    document.getElementById("calcBook").addEventListener("click", function () {
        this.dataset.book = zone.value; // booking.js listens for [data-book]
    });
    update();
})();
