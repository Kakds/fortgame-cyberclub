/* ==========================================================================
   booking.js — the "Book a seat" modal (used on Rooms and Pricing pages).
   Any element with data-book="standard|vip|ps5" opens the modal with that
   zone selected. Bookings are saved in localStorage and appear on the profile.
   ========================================================================== */

(function () {
    const form = document.getElementById("bookingForm");
    if (!form) return;

    const zoneSelect = document.getElementById("bkZone");
    const typeSelect = document.getElementById("bkType");
    const hoursOut = document.getElementById("bkHours");
    const hoursRow = document.getElementById("bkHoursRow");
    const totalOut = document.getElementById("bkTotal");
    const discountNote = document.getElementById("bkDiscount");
    const dateInput = document.getElementById("bkDate");
    let hours = 2;

    function updateTotal() {
        const user = Auth.current();
        const isNight = typeSelect.value === "night";
        hoursRow.hidden = isNight;
        if (isNight) document.getElementById("bkTime").value = "22:00";
        hoursOut.textContent = `${hours} h`;
        const total = zoneSelect.value ? sessionPrice(zoneSelect.value, typeSelect.value, hours, Boolean(user)) : 0;
        totalOut.textContent = formatKZT(total);
        discountNote.textContent = user
            ? "Member price: 10% off applied."
            : "Log in to get 10% off as a member.";
        return total;
    }

    document.getElementById("bkMinus").addEventListener("click", () => { hours = Math.max(1, hours - 1); updateTotal(); });
    document.getElementById("bkPlus").addEventListener("click", () => { hours = Math.min(12, hours + 1); updateTotal(); });
    zoneSelect.addEventListener("change", updateTotal);
    typeSelect.addEventListener("change", updateTotal);

    function openBooking(zoneKey) {
        form.reset();
        hours = 2;
        const user = Auth.current();
        if (user) {
            document.getElementById("bkName").value = user.name;
            document.getElementById("bkPhone").value = user.phone;
            document.getElementById("bkEmail").value = user.email;
        }
        if (zoneKey && ZONES[zoneKey]) zoneSelect.value = zoneKey;
        const d = new Date();
        dateInput.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        updateTotal();
        Modal.open("bookingModal");
    }

    document.addEventListener("click", e => {
        const trigger = e.target.closest("[data-book]");
        if (trigger) openBooking(trigger.dataset.book);
    });

    Validator.attach(form, {
        bkName: ["required", "name"],
        bkPhone: ["required", "phone"],
        bkEmail: ["required", "email"],
        bkZone: ["required"],
        bkDate: ["required", "notPast", "within30Days"],
        bkTime: ["required"]
    }, () => {
        const button = form.querySelector("[type=submit]");
        button.disabled = true;
        button.innerHTML = `<span class="spinner" aria-hidden="true"></span> Booking…`;

        // short delay imitates a request to the club's server
        setTimeout(() => {
            const total = updateTotal();
            const booking = Bookings.add({
                name: document.getElementById("bkName").value.trim(),
                phone: document.getElementById("bkPhone").value.trim(),
                email: document.getElementById("bkEmail").value.trim().toLowerCase(),
                zone: zoneSelect.value,
                type: typeSelect.value,
                hours: typeSelect.value === "night" ? 10 : hours,
                date: dateInput.value,
                time: document.getElementById("bkTime").value,
                total
            });
            button.disabled = false;
            button.innerHTML = `<i class="bi bi-check2-circle" aria-hidden="true"></i> Confirm booking`;
            Modal.close(document.getElementById("bookingModal"));
            const loggedIn = Auth.current();
            toast(`Booked: ${ZONES[booking.zone].name} on ${booking.date} at ${booking.time}.` + (loggedIn ? " See it in your profile." : ""));
        }, 900);
    });

    // Fill the time options (every hour from 10:00 to 22:00)
    const timeSelect = document.getElementById("bkTime");
    for (let h = 10; h <= 22; h++) {
        const option = document.createElement("option");
        option.value = option.textContent = `${String(h).padStart(2, "0")}:00`;
        timeSelect.appendChild(option);
    }

    // Opened from the home seat map: rooms.html?book=vip
    const fromUrl = new URLSearchParams(location.search).get("book");
    if (fromUrl) openBooking(fromUrl);
})();
