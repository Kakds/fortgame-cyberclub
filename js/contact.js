/* ==========================================================================
   contact.js — contact form (validated, saved to localStorage) and the
   searchable FAQ accordion.
   ========================================================================== */

(function initContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;
    const success = document.getElementById("contactSuccess");
    const message = document.getElementById("ctMessage");
    const counter = document.getElementById("ctCount");

    message.addEventListener("input", () => { counter.textContent = `${message.value.trim().length} / 500`; });

    // Prefill for logged-in users
    const user = Auth.current();
    if (user) {
        document.getElementById("ctName").value = user.name;
        document.getElementById("ctEmail").value = user.email;
        document.getElementById("ctPhone").value = user.phone;
    }

    Validator.attach(form, {
        ctName: ["required", "name"],
        ctEmail: ["required", "email"],
        ctPhone: ["required", "phone"],
        ctTopic: ["required"],
        ctMessage: ["required", ["minLength", 20], ["maxLength", 500]]
    }, () => {
        const button = form.querySelector("[type=submit]");
        button.disabled = true;
        button.innerHTML = `<span class="spinner" aria-hidden="true"></span> Sending…`;
        setTimeout(() => {
            const messages = Store.get("fg_messages", []);
            messages.push({
                name: document.getElementById("ctName").value.trim(),
                email: document.getElementById("ctEmail").value.trim(),
                phone: document.getElementById("ctPhone").value.trim(),
                topic: document.getElementById("ctTopic").value,
                message: message.value.trim(),
                sentAt: new Date().toISOString()
            });
            Store.set("fg_messages", messages);
            const name = document.getElementById("ctName").value.trim().split(" ")[0];
            form.reset();
            counter.textContent = "0 / 500";
            button.disabled = false;
            button.innerHTML = `<i class="bi bi-send" aria-hidden="true"></i> Send message`;
            success.hidden = false;
            success.querySelector("span").textContent = `Thanks, ${name}. Our admin will reply within 2 hours.`;
            success.scrollIntoView({ behavior: "smooth", block: "center" });
            setTimeout(() => { success.hidden = true; }, 7000);
        }, 900);
    });
})();

(function initFaq() {
    const faq = document.getElementById("faqList");
    if (!faq) return;
    const search = document.getElementById("faqSearch");
    const empty = document.getElementById("faqEmpty");
    const items = [...faq.querySelectorAll(".faq-item")];

    // keep the original text so highlights can be removed
    items.forEach(item => {
        item.dataset.q = item.querySelector(".faq-q span").textContent;
        item.dataset.a = item.querySelector(".faq-a p").textContent;
    });

    faq.addEventListener("click", e => {
        const button = e.target.closest(".faq-q");
        if (!button) return;
        const item = button.closest(".faq-item");
        const open = !item.classList.contains("open");
        item.classList.toggle("open", open);
        button.setAttribute("aria-expanded", String(open));
    });

    function highlight(text, term) {
        const safe = escapeHTML(text);
        if (!term) return safe;
        const pattern = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
        return safe.replace(pattern, "<mark>$1</mark>");
    }

    search.addEventListener("input", () => {
        const term = search.value.trim();
        let shown = 0;
        items.forEach(item => {
            const match = !term || (item.dataset.q + " " + item.dataset.a).toLowerCase().includes(term.toLowerCase());
            item.hidden = !match;
            item.querySelector(".faq-q span").innerHTML = highlight(item.dataset.q, term);
            item.querySelector(".faq-a p").innerHTML = highlight(item.dataset.a, term);
            // open matching answers so the highlight is visible
            item.classList.toggle("open", Boolean(term) && match);
            if (match) shown++;
        });
        empty.hidden = shown > 0;
    });
})();
