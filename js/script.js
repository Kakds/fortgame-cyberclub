/* ==========================================================================
   script.js — shared UI for every page:
   theme toggle, mobile navigation, header login state, toasts, modals,
   animated counters, newsletter form.
   ========================================================================== */

/* ---------- Toast notifications ---------- */
function toast(message, type = "ok") {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
        stack = document.createElement("div");
        stack.className = "toast-stack";
        stack.setAttribute("role", "status");
        stack.setAttribute("aria-live", "polite");
        document.body.appendChild(stack);
    }
    const item = document.createElement("div");
    item.className = `toast ${type === "err" ? "err" : ""}`;
    const icon = type === "err" ? "bi-exclamation-circle-fill" : "bi-check-circle-fill";
    item.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i><span></span>`;
    item.querySelector("span").textContent = message;
    stack.appendChild(item);
    setTimeout(() => {
        item.classList.add("out");
        item.addEventListener("animationend", () => item.remove());
    }, 3800);
}

/* ---------- Modal helper (booking, lightbox, confirm dialogs) ---------- */
const Modal = {
    lastFocus: null,
    open(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        this.lastFocus = document.activeElement;
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        const focusTarget = modal.querySelector("input, select, textarea, button:not(.modal-close)") || modal.querySelector("button");
        setTimeout(() => focusTarget && focusTarget.focus(), 50);
    },
    close(modal) {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        if (this.lastFocus) this.lastFocus.focus();
    }
};

document.addEventListener("click", event => {
    const closer = event.target.closest("[data-close]");
    if (closer) Modal.close(closer.closest(".modal"));
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        const open = document.querySelector(".modal.open");
        if (open) Modal.close(open);
    }
});

/* ---------- Helpers ---------- */
function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/* ---------- Theme toggle (saved in localStorage, applied early by theme.js) ---------- */
function initThemeToggle() {
    const button = document.getElementById("themeToggle");
    if (!button) return;
    const icon = button.querySelector("i");

    function render() {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        icon.className = isDark ? "bi bi-sun" : "bi bi-moon-stars";
        button.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
        button.title = isDark ? "Light mode" : "Dark mode";
    }

    button.addEventListener("click", () => {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        Store.set("fg_theme", next);
        render();
    });
    render();
}

/* ---------- Mobile navigation ---------- */
function initNav() {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("mainNav");
    if (!toggle || !nav) return;

    function setOpen(open) {
        nav.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.querySelector("i").className = open ? "bi bi-x-lg" : "bi bi-list";
    }
    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
    nav.addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
    window.addEventListener("resize", () => { if (window.innerWidth > 960) setOpen(false); });
}

/* ---------- Header: show "Log in" or the logged-in user ---------- */
function renderAuthSlot() {
    const slot = document.getElementById("authSlot");
    if (!slot) return;
    const user = Auth.current();
    if (user) {
        const firstName = user.name.split(" ")[0];
        slot.innerHTML = `
            <a class="user-chip" href="profile.html" title="Your profile">
                <span class="avatar">${escapeHTML(initials(user.name))}</span>
                <span class="user-name">${escapeHTML(firstName)}</span>
            </a>`;
    } else {
        slot.innerHTML = `<a class="btn btn-primary btn-sm" href="login.html"><i class="bi bi-person" aria-hidden="true"></i> Log in</a>`;
    }
}

/* ---------- Animated counters (start when scrolled into view) ---------- */
function initCounters() {
    const counters = document.querySelectorAll("[data-count]");
    if (!counters.length) return;

    const run = el => {
        const target = Number(el.dataset.count);
        const suffix = el.dataset.suffix || "";
        const duration = 1400;
        const start = performance.now();
        const step = now => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(target * eased).toLocaleString("en-US") + suffix;
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    if (!("IntersectionObserver" in window)) {
        counters.forEach(run);
        return;
    }
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                run(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    counters.forEach(el => observer.observe(el));
}

/* ---------- Footer newsletter (validated like every other form) ---------- */
function initNewsletter() {
    const form = document.getElementById("newsletterForm");
    if (!form) return;
    Validator.attach(form, { newsEmail: ["required", "email"] }, () => {
        const input = document.getElementById("newsEmail");
        const email = input.value.trim().toLowerCase();
        const list = Store.get("fg_subscribers", []);
        if (list.includes(email)) {
            Validator.showError(input, "This email is already subscribed.");
            return;
        }
        list.push(email);
        Store.set("fg_subscribers", list);
        form.reset();
        toast("Subscribed. Tournament news will come to " + email);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    initNav();
    renderAuthSlot();
    initCounters();
    initNewsletter();
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
});
