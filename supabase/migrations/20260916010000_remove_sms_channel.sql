-- SMS is no longer an offered delivery channel. Preserve historical rows for
-- audit purposes while preventing new SMS configuration or queue entries.
UPDATE public.automation_rules
SET enabled = false
WHERE channel = 'sms' AND enabled;

UPDATE public.scheduled_messages
SET status = 'failed',
    last_error = 'SMS channel removed',
    locked_at = NULL
WHERE channel = 'sms'
  AND status NOT IN ('sent', 'failed', 'cancelled');

ALTER TABLE public.message_templates
  ADD CONSTRAINT message_templates_supported_channel
  CHECK (channel IN ('email', 'whatsapp')) NOT VALID;

ALTER TABLE public.automation_rules
  ADD CONSTRAINT automation_rules_supported_channel
  CHECK (channel IN ('email', 'whatsapp')) NOT VALID;

ALTER TABLE public.scheduled_messages
  ADD CONSTRAINT scheduled_messages_supported_channel
  CHECK (channel IN ('email', 'whatsapp')) NOT VALID;
