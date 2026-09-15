insert into public.user_roles (user_id, role)
values ('6b4dfa8f-4f75-45f7-a375-9bb38896b666', 'admin')
on conflict (user_id, role) do nothing;