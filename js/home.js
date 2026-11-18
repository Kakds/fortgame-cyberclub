/* ==========================================================================
   home.js — the seat map in the home page hero.
   The club has 80 PCs: 60 in the main hall, 10 VIP, 10 BootCamp.
   Occupancy is demo data generated from the current hour (Astana time),
   so it stays the same on refresh and changes through the day.
   ========================================================================== */

(function () {
    const map = document.getElementById("seatmap");
    if (!map) return;

    const zones = [
        { id: "seatsMain", count: 60, label: "Main hall", book: "standard" },
        { id: "seatsVip", count: 10, label: "VIP room", book: "vip" },
        { id: "seatsCamp", count: 10, label: "BootCamp", book: "vip" }
    ];

    // Busier in the evening, quieter in the morning
    const hour = new Date().getHours();
    const loadByHour = hour >= 18 || hour < 1 ? 0.78 : hour >= 12 ? 0.55 : hour >= 7 ? 0.3 : 0.45;

    // Small seeded random generator so the map is stable within the hour
    let seed = new Date().toDateString().length * 1000 + new Date().getDate() * 24 + hour;
    const random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    const tip = document.getElementById("seatTip");
    let free = 0;
    let pcNumber = 1;

    zones.forEach(zone => {
        const grid = document.getElementById(zone.id);
        for (let i = 0; i < zone.count; i++) {
            const busy = random() < loadByHour;
            if (!busy) free++;
            const seat = document.createElement("span");
            seat.className = "seat" + (busy ? " busy" : "");
            seat.dataset.info = `PC ${pcNumber}, ${zone.label}: ${busy ? "in a session" : "free, click to book"}`;
            seat.dataset.book = busy ? "" : zone.book;
            seat.style.animationDelay = `${pcNumber * 12}ms`;
            seat.style.cursor = busy ? "default" : "pointer";
            grid.appendChild(seat);
            pcNumber++;
        }
    });

    document.getElementById("freeCount").textContent = free;

    map.addEventListener("mouseover", e => {
        const seat = e.target.closest(".seat");
        if (seat) tip.textContent = seat.dataset.info;
    });
    map.addEventListener("mouseleave", () => { tip.textContent = "Hover a seat to see its status."; });
    map.addEventListener("click", e => {
        const seat = e.target.closest(".seat");
        if (seat && seat.dataset.book) window.location.href = `rooms.html?book=${seat.dataset.book}`;
    });
})();
