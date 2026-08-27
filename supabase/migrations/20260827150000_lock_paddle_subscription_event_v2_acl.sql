-- Revoke execution from PUBLIC, anon, and authenticated for public.process_paddle_subscription_event_v2, granting only to service_role

revoke all on function public.process_paddle_subscription_event_v2(
  text,
  text,
  timestamptz,
  uuid,
  text,
  text,
  public.subscription_status,
  text,
  text,
  integer,
  timestamptz,
  timestamptz,
  boolean,
  text,
  text,
  text,
  text,
  timestamptz,
  boolean,
  uuid,
  text
) from public, anon, authenticated;

grant execute on function public.process_paddle_subscription_event_v2(
  text,
  text,
  timestamptz,
  uuid,
  text,
  text,
  public.subscription_status,
  text,
  text,
  integer,
  timestamptz,
  timestamptz,
  boolean,
  text,
  text,
  text,
  text,
  timestamptz,
  boolean,
  uuid,
  text
) to service_role;
