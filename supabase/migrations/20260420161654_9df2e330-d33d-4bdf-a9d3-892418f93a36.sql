
-- Drop old table that won't be used in the new flow
DROP TABLE IF EXISTS public.email_notifications;

-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins delete profiles"
  ON public.profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ ITEMS ============
CREATE TYPE public.item_type AS ENUM ('lost', 'found');

CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type item_type NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  date DATE NOT NULL,
  image_url TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SELECT: found items public; lost items only owner + admin
CREATE POLICY "Found items viewable by all, lost only by owner/admin"
  ON public.items FOR SELECT
  USING (
    type = 'found'
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Authenticated users insert own items"
  ON public.items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner or admin updates items"
  ON public.items FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner or admin deletes items"
  ON public.items FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============ CLAIMS ============
CREATE TYPE public.claim_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  found_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  claimant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status claim_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (found_item_id, claimant_id)
);
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Claimant sees own; finder (item owner) sees claims on their items; admin sees all
CREATE POLICY "Claims viewable by claimant, finder, admin"
  ON public.claims FOR SELECT USING (
    auth.uid() = claimant_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.items i WHERE i.id = found_item_id AND i.user_id = auth.uid())
  );
CREATE POLICY "Authenticated users create claims"
  ON public.claims FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = claimant_id);
CREATE POLICY "Admins update claims"
  ON public.claims FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete claims"
  ON public.claims FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============ PUBLIC VIEW: masked found items ============
-- Hides location + description on found items unless viewer is owner, admin, or has approved claim
CREATE OR REPLACE VIEW public.items_public
WITH (security_invoker = on) AS
SELECT
  i.id, i.user_id, i.type, i.title, i.category, i.image_url,
  i.is_resolved, i.date, i.created_at, i.updated_at,
  CASE
    WHEN i.type = 'lost' THEN i.description
    WHEN auth.uid() = i.user_id THEN i.description
    WHEN public.has_role(auth.uid(), 'admin') THEN i.description
    WHEN EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.found_item_id = i.id AND c.claimant_id = auth.uid() AND c.status = 'approved'
    ) THEN i.description
    ELSE LEFT(i.description, 60) || '... (full details revealed after claim approval)'
  END AS description,
  CASE
    WHEN i.type = 'lost' THEN i.location
    WHEN auth.uid() = i.user_id THEN i.location
    WHEN public.has_role(auth.uid(), 'admin') THEN i.location
    WHEN EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.found_item_id = i.id AND c.claimant_id = auth.uid() AND c.status = 'approved'
    ) THEN i.location
    ELSE 'Hidden — claim to reveal'
  END AS location
FROM public.items i;

-- ============ EMAIL NOTIFICATIONS LOG ============
CREATE TABLE public.email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read notifications" ON public.email_notifications
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
