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
