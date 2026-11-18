/* ==========================================================================
   auth-forms.js — Sign up and Log in simulation (no backend).
   Sign up: validates, checks the email is free, stores the user, goes to Log in.
   Log in: checks the email/password pair and redirects to the Profile page.
   ========================================================================== */

/** Show / hide password buttons (used on sign up, log in and profile). */
function initPasswordReveal() {
    document.querySelectorAll(".reveal").forEach(button => {
        button.addEventListener("click", () => {
            const input = document.getElementById(button.dataset.target);
            const show = input.type === "password";
            input.type = show ? "text" : "password";
            button.querySelector("i").className = show ? "bi bi-eye-slash" : "bi bi-eye";
            button.setAttribute("aria-label", show ? "Hide password" : "Show password");
        });
    });
}

/** Live strength meter + checklist under a password field. */
function initStrengthMeter(inputId, meterId, rulesId) {
    const input = document.getElementById(inputId);
    const meter = document.getElementById(meterId);
    const rules = document.getElementById(rulesId);
    if (!input || !meter) return;
    input.addEventListener("input", () => {
        const checks = Validator.passwordChecks(input.value);
        const met = Object.values(checks).filter(Boolean).length;
        meter.dataset.level = input.value ? String(Math.max(1, met - 1)) : "0";
        Object.entries(checks).forEach(([rule, ok]) => {
            const li = rules.querySelector(`[data-rule="${rule}"]`);
            if (li) li.classList.toggle("met", ok);
        });
    });
}

(function initSignup() {
    const form = document.getElementById("signupForm");
    if (!form) return;

    initPasswordReveal();
    initStrengthMeter("suPassword", "suStrength", "suRules");

    const emailInput = document.getElementById("suEmail");
    const alertBox = document.getElementById("signupAlert");

    Validator.attach(form, {
        suName: ["required", "name"],
        suEmail: ["required", "email"],
        suPhone: ["required", "phone"],
        suPassword: ["required", "password"],
        suConfirm: ["required", ["match", "suPassword"]],
        suZone: ["required"],
        suTerms: ["required"]
    }, () => {
        if (Auth.find(emailInput.value)) {
            Validator.showError(emailInput, "An account with this email already exists. Log in instead.");
            emailInput.focus();
            return;
        }
        const user = Auth.register({
            name: document.getElementById("suName").value,
            email: emailInput.value,
            phone: document.getElementById("suPhone").value,
            password: document.getElementById("suPassword").value,
            zone: document.getElementById("suZone").value
        });

        const button = form.querySelector("[type=submit]");
        button.disabled = true;
        button.innerHTML = `<span class="spinner" aria-hidden="true"></span> Creating account…`;
        alertBox.hidden = false;
        alertBox.className = "form-alert ok";
        alertBox.querySelector("span").textContent = `Account created for ${user.email}. Taking you to log in…`;
        setTimeout(() => {
            window.location.href = `login.html?registered=${encodeURIComponent(user.email)}`;
        }, 1400);
    });

    // Re-check "confirm" when the password changes after confirm was filled
    document.getElementById("suPassword").addEventListener("input", () => {
        const confirm = document.getElementById("suConfirm");
        if (confirm.dataset.touched) Validator.validateField(confirm, ["required", ["match", "suPassword"]]);
    });
})();

(function initLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    initPasswordReveal();
    const alertBox = document.getElementById("loginAlert");
    const emailInput = document.getElementById("liEmail");
    const params = new URLSearchParams(location.search);

    function showAlert(type, text) {
        alertBox.hidden = false;
        alertBox.className = `form-alert ${type}`;
        alertBox.querySelector("i").className = type === "ok" ? "bi bi-check-circle" : "bi bi-exclamation-triangle";
        alertBox.querySelector("span").textContent = text;
    }

    if (params.get("registered")) {
        emailInput.value = params.get("registered");
        showAlert("ok", "Your account is ready. Enter your password to log in.");
        document.getElementById("liPassword").focus();
    } else if (params.get("next") === "profile") {
        showAlert("err", "Log in to see your profile.");
    }

    const current = Auth.current();
    if (current && !params.get("registered")) {
        showAlert("ok", `You're already logged in as ${current.name}.`);
    }

    Validator.attach(form, {
        liEmail: ["required", "email"],
        liPassword: ["required"]
    }, () => {
        const user = Auth.login(emailInput.value, document.getElementById("liPassword").value);
        if (!user) {
            const exists = Auth.find(emailInput.value);
            showAlert("err", exists
                ? "That password is wrong. Check Caps Lock and try again."
                : "No account uses this email. Check it or sign up first.");
            form.classList.remove("shake");
            void form.offsetWidth;
            form.classList.add("shake");
            return;
        }
        const button = form.querySelector("[type=submit]");
        button.disabled = true;
        button.innerHTML = `<span class="spinner" aria-hidden="true"></span> Logging in…`;
        showAlert("ok", `Welcome back, ${user.name.split(" ")[0]}!`);
        setTimeout(() => { window.location.href = "profile.html"; }, 800);
    });
})();
