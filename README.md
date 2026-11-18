# FortGame CyberClub

A multi-page responsive website for FortGame, a 24/7 cyber club in Astana. Final project by Sultan Uazhanov, Kaisar Arysbek and Dias Turdaly (group SE-2511).

**Live website:** https://sultan2511se.github.io/fortgame-cyberclub/

Audience: students, gamers and esports teams in Astana who want to check prices, see free seats and book a session online.

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Hero with the club seat map, zones, booking steps, features, tournament banner |
| `rooms.html` | Zone details, booking modal, games library with search and filters, photo gallery |
| `pricing.html` | Hourly / night price switch, session calculator, rates table |
| `games.html` | Live game deals from the CheapShark API (search, sort, save) |
| `about.html` | Story, timeline, club rules, team |
| `contact.html` | Contacts, map, contact form, searchable FAQ |
| `signup.html` / `login.html` / `profile.html` | Simulated accounts with localStorage |

## Features (by rubric)

- **Responsive**: CSS Grid and Flexbox, breakpoints at 1080, 960 and 640 px, mobile menu.
- **Light / dark mode**: toggle in the header, saved in `localStorage` (`fg_theme`) and applied before the page paints (`js/theme.js`).
- **Authentication simulation**: sign up stores name, email, phone, password and favourite zone; log in checks the credentials and redirects to the profile; the profile shows the stored details, bookings and saved games, and lets the user edit details, log out or delete the account (`js/storage.js`, `js/auth-forms.js`, `js/profile.js`).
- **Form validation**: every form has `novalidate` and is validated in `js/validation.js` (required fields, email format, password length and complexity, Kazakhstan phone pattern, matching passwords, dates). Errors appear under each field.
- **Search and filtering**: games library (text, genre, platform; saved in `localStorage`), FAQ search with highlighting, game deals search with recent searches saved.
- **API**: [CheapShark](https://apidocs.cheapshark.com) via `fetch` + `async/await`, with loading skeletons, error message and retry (`js/games.js`).
- **Animations**: seat map load sequence, button light sweep and lift, card hover, icon spin on the theme toggle, modal and toast transitions. `prefers-reduced-motion` is respected.

## Structure

```
/
├── index.html, rooms.html, pricing.html, games.html, about.html,
│   contact.html, signup.html, login.html, profile.html
├── css/style.css
├── js/
│   ├── theme.js        theme applied in <head>
│   ├── storage.js      localStorage helpers, prices, Auth, Bookings, Wishlist
│   ├── validation.js   reusable form validator
│   ├── script.js       shared UI: theme toggle, nav, toasts, modals, counters, newsletter
│   └── home.js, rooms.js, booking.js, pricing.js, games.js, contact.js, auth-forms.js, profile.js
└── images/
```
