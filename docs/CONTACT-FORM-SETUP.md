# SalahNest Help & Feedback form

## What the page collects

The web-only Help & Feedback page is part of the SalahNest GitHub Pages PWA. It is not included in the Android or desktop app builds.

Visitors can submit an optional name (up to 80 characters), a required email address (up to 254 characters), a required topic (App help, Report a problem, Feedback, or Feature idea), and a required message (up to 4,000 characters). A hidden honeypot helps detect automated spam. The form does not accept attachments or collect account credentials, location, or other app data.

## Provider and privacy

Formspree is the hosted backend for this static site. The browser sends the four visible fields to the configured HTTPS form endpoint; Formspree sends a notification to the destination configured privately in the Formspree dashboard. That destination is not in the webpage, JavaScript, or this repository. The public endpoint is not the recipient address.

Formspree uses the form's `email` field as the notification's Reply-To address, so the site owner can reply to the sender. The test submission confirmed this behavior. The SalahNest app does not save or log form contents.

The form discloses that submissions go through Formspree and links to its privacy information. Formspree's Free plan documents 30 days of submission history and 50 submissions per month; other plans may differ. Its privacy policy describes processing in the U.S. and other countries.

Sources: [Formspree reply-to behavior](https://help.formspree.io/articles/building-your-form/email-reply-to-address), [special fields](https://help.formspree.io/articles/building-your-form/special-fields), [account limits](https://help.formspree.io/articles/account-management/account-limits), and [privacy policy](https://formspree.io/legal/privacy-policy/).

## Setup and verification status

The owner created the Formspree form and supplied its endpoint. It is configured in `js/contact-config.js`; no destination address is stored in the source or generated website.

Before publication, one non-sensitive test submission was sent from the SalahNest GitHub Pages origin. Formspree accepted it, the notification arrived in the requested mailbox, and the owner confirmed the Reply-To header matched the submitted test email address. No credentials or sensitive personal information were included in the test.

If the destination mailbox changes, update and verify it in Formspree rather than in the website source, then run another non-sensitive delivery test. If the endpoint changes, update `js/contact-config.js`, rebuild the web bundle, and verify the public bundle contains no destination address before publishing.
