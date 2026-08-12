create index billing_webhook_events_child_id_idx
  on public.billing_webhook_events (child_id)
  where child_id is not null;
