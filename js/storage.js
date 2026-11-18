/* ==========================================================================
   storage.js — localStorage helpers, club data and the simulated auth system.
   There is no backend, so every "account" lives in this browser only.
   ========================================================================== */

/** Safe JSON wrapper around localStorage (never throws). */
const Store = {
    get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) { /* storage full or disabled */ }
    },
    remove(key) {
        try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }
};

/** Zones and prices (KZT) used by pricing, booking and profile pages. */
const ZONES = {
    standard: { name: "Standard Hall", hour: 1000, night: 4500, gear: "RTX 4060, 144 Hz" },
    vip:      { name: "VIP Room",      hour: 1800, night: 7500, gear: "RTX 4080, 240 Hz" },
    ps5:      { name: "PS5 Lounge",    hour: 2000, night: 8000, gear: "PlayStation 5, 65\" 4K OLED" }
};

const MEMBER_DISCOUNT = 0.10; // logged-in members get 10% off

/** Format a number as tenge: 12500 -> "12 500 ₸" */
function formatKZT(value) {
    return Math.round(value).toLocaleString("ru-RU").replace(/ /g, " ") + " ₸";
}

/** Price for a session, with the member discount applied when a user is logged in. */
function sessionPrice(zoneKey, type, hours, isMember) {
    const zone = ZONES[zoneKey];
    if (!zone) return 0;
    const base = type === "night" ? zone.night : zone.hour * hours;
    return isMember ? base * (1 - MEMBER_DISCOUNT) : base;
}

/* --------------------------------------------------------------------------
   Auth simulation
   Users are stored as an array under "fg_users"; the logged-in user's email
   is stored under "fg_session".
   -------------------------------------------------------------------------- */
const Auth = {
    USERS_KEY: "fg_users",
    SESSION_KEY: "fg_session",

    users() {
        return Store.get(this.USERS_KEY, []);
    },

    find(email) {
        const target = String(email).trim().toLowerCase();
        return this.users().find(u => u.email === target) || null;
    },

    register({ name, email, phone, password, zone }) {
        const users = this.users();
        const user = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            password,               // plain text is acceptable only because this is a classroom simulation
            zone,
            wishlist: [],
            createdAt: new Date().toISOString()
        };
        users.push(user);
        Store.set(this.USERS_KEY, users);
        return user;
    },

    /** Returns the user on success, null when the email/password pair is wrong. */
    login(email, password) {
        const user = this.find(email);
        if (!user || user.password !== password) return null;
        Store.set(this.SESSION_KEY, user.email);

        // Games saved as a guest move to the account on login
        const guestList = Store.get(Wishlist.GUEST_KEY, []);
        if (guestList.length) {
            const own = user.wishlist || [];
            const merged = own.concat(guestList.filter(g => !own.some(d => d.dealID === g.dealID)));
            Store.remove(Wishlist.GUEST_KEY);
            return this.update(user.email, { wishlist: merged });
        }
        return user;
    },

    current() {
        const email = Store.get(this.SESSION_KEY);
        return email ? this.find(email) : null;
    },

    update(email, changes) {
        const users = this.users().map(u => (u.email === email ? { ...u, ...changes } : u));
        Store.set(this.USERS_KEY, users);
        return this.find(email);
    },

    logout() {
        Store.remove(this.SESSION_KEY);
    },

    remove(email) {
        Store.set(this.USERS_KEY, this.users().filter(u => u.email !== email));
        Store.set("fg_bookings", Bookings.all().filter(b => b.email !== email));
        this.logout();
    }
};

/* --------------------------------------------------------------------------
   Bookings — stored for everyone; the profile shows the ones matching the
   logged-in user's email.
   -------------------------------------------------------------------------- */
const Bookings = {
    KEY: "fg_bookings",
    all() { return Store.get(this.KEY, []); },
    add(booking) {
        const list = this.all();
        const item = { id: Date.now().toString(36), createdAt: new Date().toISOString(), ...booking };
        list.push(item);
        Store.set(this.KEY, list);
        return item;
    },
    forEmail(email) {
        return this.all()
            .filter(b => b.email === email)
            .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    },
    cancel(id) {
        Store.set(this.KEY, this.all().filter(b => b.id !== id));
    }
};

/* --------------------------------------------------------------------------
   Saved game deals ("wishlist"). Logged-in users keep it on their account,
   guests keep it under a separate key.
   -------------------------------------------------------------------------- */
const Wishlist = {
    GUEST_KEY: "fg_wishlist_guest",
    all() {
        const user = Auth.current();
        return user ? (user.wishlist || []) : Store.get(this.GUEST_KEY, []);
    },
    save(list) {
        const user = Auth.current();
        if (user) Auth.update(user.email, { wishlist: list });
        else Store.set(this.GUEST_KEY, list);
    },
    has(dealID) {
        return this.all().some(d => d.dealID === dealID);
    },
    /** Adds or removes a deal; returns true when the deal is now saved. */
    toggle(deal) {
        const list = this.all();
        const index = list.findIndex(d => d.dealID === deal.dealID);
        if (index >= 0) {
            list.splice(index, 1);
            this.save(list);
            return false;
        }
        list.push(deal);
        this.save(list);
        return true;
    }
};
