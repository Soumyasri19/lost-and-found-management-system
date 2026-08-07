-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  item_title TEXT NOT NULL,
  finder_username TEXT NOT NULL,
  finder_email TEXT NOT NULL,
  finder_phone TEXT,
  finder_location TEXT,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- Trigger: when a claim is approved, notify the lost item owner with finder details
CREATE OR REPLACE FUNCTION public.notify_on_claim_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_item RECORD;
  finder_profile RECORD;
  claimant_profile RECORD;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT * INTO found_item FROM public.items WHERE id = NEW.found_item_id;
    SELECT username, email, phone FROM public.profiles WHERE user_id = found_item.user_id INTO finder_profile;
    SELECT username, email, phone FROM public.profiles WHERE user_id = NEW.claimant_id INTO claimant_profile;

    -- Notify the claimant (the person who lost the item) with the finder's details
    INSERT INTO public.notifications (
      user_id, claim_id, item_id, item_title,
      finder_username, finder_email, finder_phone, finder_location, message
    ) VALUES (
      NEW.claimant_id, NEW.id, found_item.id, found_item.title,
      finder_profile.username, finder_profile.email, finder_profile.phone,
      found_item.location,
      'Your claim was approved! Contact the finder using the details below to arrange pickup.'
    );

    -- Also notify the finder so they know to expect contact
    INSERT INTO public.notifications (
      user_id, claim_id, item_id, item_title,
      finder_username, finder_email, finder_phone, finder_location, message
    ) VALUES (
      found_item.user_id, NEW.id, found_item.id, found_item.title,
      claimant_profile.username, claimant_profile.email, claimant_profile.phone,
      found_item.location,
      'A claim on your found item was approved. The owner will reach out — their contact details are below.'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_claim_approval
AFTER UPDATE ON public.claims
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_claim_approval();