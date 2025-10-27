-- Seed example data (run in dev only). Replace the user id with your auth user id.
-- select auth.uid(); -- run in SQL editor after authenticating as your test user
-- then set below:
-- \set myuid '00000000-0000-0000-0000-000000000000'

-- insert into public.campaigns (id, user_id, name, objective, language) values (gen_random_uuid(), :'myuid', 'Sample Campaign', 'Book intros with heads of sales', 'en');
-- insert into public.prospects (user_id, first_name, last_name, company, title, email) values
--   (:'myuid', 'Alice', 'Durand', 'Acme', 'Head of Sales', 'alice@example.com'),
--   (:'myuid', 'Bob', 'Martin', 'Globex', 'Sales Director', 'bob@example.com'),
--   (:'myuid', 'Claire', 'Petit', 'Innotech', 'VP Sales', 'claire@example.com');


