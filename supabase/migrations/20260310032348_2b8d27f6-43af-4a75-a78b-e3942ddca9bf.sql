-- Table to track sent match notifications and avoid duplicates
CREATE TABLE public.email_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lost_item_id TEXT NOT NULL,
  found_item_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lost_item_id, found_item_id)
);

-- Enable RLS
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- Allow edge functions (service role) to manage notifications
CREATE POLICY "Service role can manage notifications"
  ON public.email_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow public read access for duplicate checking
CREATE POLICY "Anyone can read notifications"
  ON public.email_notifications
  FOR SELECT
  TO anon, authenticated
  USING (true);