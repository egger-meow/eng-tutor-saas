alter table public.subscriptions
  add column cancellation_reason text
    check (cancellation_reason is null or char_length(cancellation_reason) <= 1000);
