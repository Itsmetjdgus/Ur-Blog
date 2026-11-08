# Tidnote

A place for the things you rarely say. Write about your day or what's on your mind, with words or a photo.

Status: in development.

## Live
- https://itsmetjdgus.github.io/tidnote/

## Features
- Sign up, log in, and password reset
- Write, edit, and delete posts with an optional cover photo
- Post list with search and pagination
- Comments, nicknames, and user blog pages
- Reporting, account deletion, and a help page with crisis resources

## Tech
- HTML, CSS, vanilla JavaScript
- Supabase (Auth, Postgres with Row Level Security, Storage)
- GitHub Pages

## Security
- Row Level Security on every table, so users can only change their own data
- Database constraints and triggers (length limits, rate limits, timestamp protection)
- No secret keys in this repository (only the public client key is used in the browser)

## Database
`schema.sql` contains the table, policy, trigger, and function definitions.