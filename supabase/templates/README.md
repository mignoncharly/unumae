# Email templates

Paste these into **Authentication → Emails** on the hosted project. They only
become editable once custom SMTP is configured.

| File | Supabase template |
| --- | --- |
| `magic-link.html` | Magic link or OTP |
| `confirmation.html` | Confirm sign up |

Both, not one. Supabase chooses between them by whether the address is already
known, so fixing only one makes sign-in work for new people and not returning
ones, or the reverse.

## The rule these follow

**They must contain `{{ .Token }}` and must not contain `{{ .ConfirmationURL }}`.**

The app asks for a code — `signInWithOtp` to send, `verifyOtp` with
`type: 'email'` to check. A link cannot complete that flow: it hands the session
to a browser, and the browser then has to get it back to the app. With the stock
templates the first real sign-in landed on `http://localhost:3000` with a valid
session sitting in the URL fragment and nothing listening for it.

## Why there are no comments in the files

An HTML comment is invisible when the mail is rendered and entirely present in
its source. Anything explained inside the template travels to every inbox and
can be read by anyone who opens the raw message — including, in the first draft
of these, the sentence about sign-in having redirected to localhost.

So the explanation lives here and the templates stay clean.

## The code length is not fixed

This project issues eight digits; six is Supabase's default. The app accepts six
to ten (`src/app/(auth)/verify.tsx`) because the length is a dashboard setting
and pinning it in the client was already a bug once — an eight-digit code could
not be typed into a six-character field, and it failed as though the person had
mistyped it.

The templates deliberately say neither number.

## Why they look the way they do

Email is not the web. These are written for clients that largely stopped
improving around 2007, so:

- **Tables, not divs.** Outlook renders through Word, which has no flexbox and
  no grid.
- **Inline styles only.** Gmail strips `<style>` blocks and ignores classes.
- **No images.** Most clients block remote images by default, so a template
  that leans on one arrives broken for most people. The wordmark is set type,
  not a picture.
- **No web fonts.** They do not load. A system stack is what everyone sees
  anyway.
- **480px wide.** Comfortable on a phone, which is where most of these are
  opened.

Colours are the app's own tokens — `#0B0B0C` text, `#5A5A57` secondary,
`#8E8E8A` tertiary, `#F7F7F5` surface, `#E4E4E1` border — so the mail and the
product look like the same thing.

`tests/email-templates.test.ts` asserts all of it, including the rule that
matters most: the code is present and no link is.

## Seeing them without sending one

Open the `.html` files in a browser. `{{ .Token }}` shows literally, which is
enough to judge the layout. A browser is far more forgiving than a mail client,
so anything that looks wrong there is definitely wrong.

## They are English only

Supabase renders one template per event and gives it no locale, so these cannot
follow the app's language. English is canonical (Article 9.6), which makes that
the right single choice rather than merely the available one.
