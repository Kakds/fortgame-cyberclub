/* ==========================================================================
   validation.js — custom form validation (no HTML validation attributes).
   Every form has `novalidate`; each field gets a <p class="field-error">
   with id "<fieldId>-error" where messages are shown.

   Usage:
     Validator.attach(form, {
        email: ["required", "email"],
        password: ["required", "password"],
        confirm: ["required", ["match", "password"]]
     }, onValidSubmit);
   ========================================================================== */

const Validator = (() => {
    const PATTERNS = {
        email: /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i,
        // Kazakhstan mobile: +7 7XX XXX XX XX or 8 7XX XXX XX XX (spaces, dashes, brackets allowed)
        phone: /^(\+7|8)7\d{9}$/,
        name: /^[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі' -]{2,40}$/
    };

    /** Which password requirements a value meets (used by the strength meter too). */
    function passwordChecks(value) {
        return {
            length: value.length >= 8,
            upper: /[A-Z]/.test(value),
            lower: /[a-z]/.test(value),
            number: /\d/.test(value),
            symbol: /[^A-Za-z0-9]/.test(value)
        };
    }

    function labelFor(el) {
        const label = el.form && el.form.querySelector(`label[for="${el.id}"]`);
        return label ? label.textContent.replace("*", "").trim().toLowerCase() : "this field";
    }

    /* Each rule returns "" when valid, or a user-friendly message. */
    const RULES = {
        required(value, el) {
            if (el.type === "checkbox") return el.checked ? "" : "Please tick this box to continue.";
            if (el.tagName === "SELECT") return value ? "" : `Please choose ${labelFor(el)}.`;
            return value.trim() ? "" : `Please enter ${labelFor(el)}.`;
        },
        email(value) {
            return PATTERNS.email.test(value.trim()) ? "" : "Enter an email like name@example.com.";
        },
        phone(value) {
            const digits = value.replace(/[\s()-]/g, "");
            return PATTERNS.phone.test(digits) ? "" : "Enter a Kazakhstan mobile number like +7 707 123 45 67.";
        },
        name(value) {
            return PATTERNS.name.test(value.trim()) ? "" : "Use letters only, 2 to 40 characters.";
        },
        password(value) {
            const c = passwordChecks(value);
            const missing = [];
            if (!c.length) missing.push("at least 8 characters");
            if (!c.upper) missing.push("an uppercase letter");
            if (!c.lower) missing.push("a lowercase letter");
            if (!c.number) missing.push("a number");
            if (!c.symbol) missing.push("a symbol such as ! or #");
            return missing.length ? `Password needs ${missing.join(", ")}.` : "";
        },
        match(value, el, otherId) {
            const other = document.getElementById(otherId);
            return other && value === other.value ? "" : "Passwords don't match.";
        },
        minLength(value, el, n) {
            return value.trim().length >= n ? "" : `Write at least ${n} characters (now ${value.trim().length}).`;
        },
        maxLength(value, el, n) {
            return value.trim().length <= n ? "" : `Keep it under ${n} characters.`;
        },
        notPast(value) {
            if (!value) return "Pick a date.";
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return new Date(value + "T00:00:00") >= today ? "" : "Pick today or a later date.";
        },
        within30Days(value) {
            const limit = new Date();
            limit.setDate(limit.getDate() + 30);
            return new Date(value + "T00:00:00") <= limit ? "" : "Bookings open up to 30 days ahead.";
        }
    };

    function showError(el, message) {
        const box = document.getElementById(`${el.id}-error`);
        if (box) box.textContent = message;
        el.classList.toggle("is-invalid", Boolean(message));
        el.classList.toggle("is-valid", !message && el.type !== "checkbox");
        el.setAttribute("aria-invalid", message ? "true" : "false");
    }

    function clear(el) {
        const box = document.getElementById(`${el.id}-error`);
        if (box) box.textContent = "";
        el.classList.remove("is-invalid", "is-valid");
        el.removeAttribute("aria-invalid");
    }

    /** Runs the rule list for one field; returns true when it passes. */
    function validateField(el, rules) {
        const value = el.value || "";
        const isRequired = rules.includes("required");

        // Optional and empty: nothing to check
        if (!isRequired && !value.trim()) {
            clear(el);
            return true;
        }
        for (const rule of rules) {
            const [name, arg] = Array.isArray(rule) ? rule : [rule];
            const message = RULES[name](value, el, arg);
            if (message) {
                showError(el, message);
                return false;
            }
        }
        showError(el, "");
        return true;
    }

    /**
     * Wires up a form: validates on submit, then live on blur/input once a field
     * has been touched. Calls onValid(form) only when every field passes.
     */
    function attach(form, schema, onValid) {
        const fields = Object.keys(schema).map(id => document.getElementById(id)).filter(Boolean);

        fields.forEach(el => {
            const rules = schema[el.id];
            el.setAttribute("aria-describedby", `${el.id}-error`);
            el.addEventListener("blur", () => {
                if (el.value || el.dataset.touched) {
                    el.dataset.touched = "1";
                    validateField(el, rules);
                }
            });
            el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input", () => {
                if (el.dataset.touched) validateField(el, rules);
            });
        });

        form.addEventListener("submit", event => {
            event.preventDefault();
            let firstInvalid = null;
            fields.forEach(el => {
                el.dataset.touched = "1";
                if (!validateField(el, schema[el.id]) && !firstInvalid) firstInvalid = el;
            });
            if (firstInvalid) {
                firstInvalid.focus();
                form.classList.remove("shake");
                void form.offsetWidth; // restart the animation
                form.classList.add("shake");
                return;
            }
            onValid(form);
        });

        form.addEventListener("reset", () => fields.forEach(el => { clear(el); delete el.dataset.touched; }));
    }

    return { attach, validateField, showError, clear, passwordChecks };
})();
