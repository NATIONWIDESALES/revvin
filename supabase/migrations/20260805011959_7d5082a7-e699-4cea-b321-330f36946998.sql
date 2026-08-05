create or replace function public.fn_offer_is_restricted_category(p_category text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_category, '') in ('Finance', 'Insurance', 'Legal', 'Mortgage')
$$;

create or replace function public.prevent_offer_privileged_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := has_role(auth.uid(), 'admin');
begin
  if v_is_admin or auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.restricted := fn_offer_is_restricted_category(new.category);
    new.approval_status := case when new.restricted then 'pending_approval' else 'approved' end;
    new.featured := false;
    new.is_sample := false;
    return new;
  end if;

  new.featured := old.featured;
  new.is_sample := old.is_sample;
  new.restricted := fn_offer_is_restricted_category(new.category);

  if fn_offer_is_restricted_category(new.category)
     and not fn_offer_is_restricted_category(old.category) then
    new.approval_status := 'pending_approval';
  elsif fn_offer_is_restricted_category(new.category) then
    new.approval_status := old.approval_status;
  else
    new.approval_status := case
      when fn_offer_is_restricted_category(old.category) then 'approved'
      else coalesce(old.approval_status, 'approved')
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_offer_privileged_updates on public.offers;
create trigger trg_prevent_offer_privileged_updates
before insert or update on public.offers
for each row execute function public.prevent_offer_privileged_updates();