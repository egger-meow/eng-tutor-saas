create function private_generation.create_beta_trial_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.subscriptions (child_id, provider, status)
  values (new.id, 'beta', 'trialing');
  return new;
end;
$$;

revoke all on function private_generation.create_beta_trial_subscription()
from public, anon, authenticated;

create trigger create_beta_trial_subscription_after_child
after insert on public.children
for each row execute function private_generation.create_beta_trial_subscription();
