# Admin setup

How to create and remove admin accounts for the Mondelos Nature Park CMS. There is no public registration: admins are created by hand in the Supabase Dashboard.

Menu labels in the Dashboard can change between releases. If a label below does not match, look for the closest one. Never paste a key or password into this repository, an issue or a chat.

## 1. Turn off public sign-ups (once per project)

1. Open the Supabase Dashboard and select the project.
2. Go to **Authentication** → **Sign In / Providers**.
3. Turn **off** "Allow new users to sign up".
4. Save.

## 2. Add the user

1. In the Dashboard, go to **Authentication** → **Users**.
2. Click **Add user** → **Create new user**.
3. Enter the admin's email and a strong password.
4. Tick auto-confirm (the label is usually "Auto Confirm User"), so no confirmation email is needed.
5. Click **Create user**.

## 3. Give the user the admin role

A new user has no access to the CMS until a profile row exists.

1. In the Dashboard, go to **SQL Editor** → **New query**.
2. Paste the snippet below, replacing `<name>` and `<email>` (keep the quotes):

```sql
insert into public.profiles (id, full_name, role)
select id, '<name>', 'admin'
from auth.users
where email = '<email>';
```

3. Click **Run**. Expected result: one row inserted. If it inserts 0 rows, the email does not match a user from step 2.

## 4. Test the login

The `/admin` area is built in Phase 3. Once it is deployed:

1. Open `/admin/login` on the site.
2. Sign in with the email and password from step 2.
3. You should land on the admin dashboard. If you see "not authorized", check the profile row from step 3.

## 5. Remove an admin

Run in **SQL Editor**, replacing `<email>`:

```sql
delete from public.profiles
where id = (select id from auth.users where email = '<email>');
```

This removes CMS access immediately. To also remove the login itself, go to **Authentication** → **Users**, open the user's menu and choose **Delete user**.

## 6. Verify after `supabase db push`

Run these once after the developer pushes the migrations to the project.

1. In **SQL Editor**, run `select park_name, address_line from public.site_settings;`. Expected: exactly 1 row. The migration creates it; if it is missing, the push did not finish.
2. For the demo content (sample sections, experiences, attractions and gallery categories), run the contents of `supabase/seed.sql` once in the **SQL Editor**. Do not run it twice: it inserts rows.
3. Open **Advisors** → **Security Advisor**. These warnings are expected and accepted: `public.is_admin` and `public.submit_contact_message` are security-definer functions executable by anon/authenticated. `is_admin` runs inside the public read policies, and the contact function is the only public write path. Any other warning needs a look.
4. Check ownership with `select tablename, tableowner from pg_tables where schemaname = 'public';`. Every table should be owned by `postgres`, and so should the functions (`select proname, proowner::regrole from pg_proc where pronamespace = 'public'::regnamespace;`).
