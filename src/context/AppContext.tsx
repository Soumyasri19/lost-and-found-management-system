import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Session, User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Item, Claim, ItemType, Notification } from '@/types';
import { toast } from 'sonner';

interface NewItemInput {
  type: ItemType;
  title: string;
  category: string;
  description: string;
  location: string;
  date: string;
  image_url?: string | null;
}

interface AppContextType {
  authUser: AuthUser | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  items: Item[];
  myClaims: Claim[];
  claimsForReview: Claim[]; // admin only
  notifications: Notification[];
  unreadCount: number;
  refreshItems: () => Promise<void>;
  refreshClaims: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (username: string, email: string, phone: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  addItem: (item: NewItemInput) => Promise<boolean>;
  deleteItem: (id: string) => Promise<void>;
  createClaim: (foundItemId: string, message: string) => Promise<boolean>;
  reviewClaim: (claimId: string, status: 'approved' | 'rejected') => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);
  const [claimsForReview, setClaimsForReview] = useState<Claim[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load profile + role for current user
  const loadProfile = useCallback(async (userId: string) => {
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);
    if (!prof) {
      setProfile(null);
      return;
    }
    const isAdmin = roles?.some(r => r.role === 'admin');
    setProfile({
      id: prof.id,
      user_id: prof.user_id,
      username: prof.username,
      email: prof.email,
      phone: prof.phone,
      role: isAdmin ? 'admin' : 'user',
    });
  }, []);

  const refreshItems = useCallback(async () => {
    // Use the masked public view so non-owners see redacted location/description for found items
    const { data, error } = await supabase
      .from('items_public' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('items load failed', error);
      return;
    }
    setItems((data as unknown as Item[]) ?? []);
  }, []);

  const refreshClaims = useCallback(async () => {
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return;
    const all = (data as Claim[]) ?? [];
    setMyClaims(all.filter(c => c.claimant_id === authUser?.id));
    setClaimsForReview(all);
  }, [authUser?.id]);

  const refreshNotifications = useCallback(async () => {
    if (!authUser) { setNotifications([]); return; }
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false });
    if (error) { console.error('notifications load failed', error); return; }
    setNotifications((data as Notification[]) ?? []);
  }, [authUser]);

  const markNotificationRead = useCallback(async (id: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    if (!authUser) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', authUser.id)
      .eq('is_read', false);
    if (error) { toast.error(error.message); return; }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, [authUser]);

  // Auth bootstrap
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setAuthUser(sess?.user ?? null);
      if (sess?.user) {
        // defer to avoid deadlock inside the listener
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setAuthUser(sess?.user ?? null);
      if (sess?.user) loadProfile(sess.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // Load items on mount and whenever auth state changes (RLS recomputes visibility)
  useEffect(() => {
    refreshItems();
  }, [refreshItems, authUser?.id, profile?.role]);

  useEffect(() => {
    if (authUser) refreshClaims();
    else { setMyClaims([]); setClaimsForReview([]); }
  }, [authUser, refreshClaims]);

  // Load notifications + realtime subscription
  useEffect(() => {
    if (!authUser) { setNotifications([]); return; }
    refreshNotifications();
    const channel = supabase
      .channel(`notif-${authUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${authUser.id}`,
      }, (payload) => {
        const n = payload.new as Notification;
        setNotifications(prev => [n, ...prev]);
        toast.success('New notification', { description: n.message ?? n.item_title });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authUser, refreshNotifications]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); return false; }
    toast.success('Welcome back!');
    return true;
  }, []);

  const signUp = useCallback(async (username: string, email: string, phone: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { username, phone },
      },
    });
    if (error) { toast.error(error.message); return false; }
    toast.success('Account created!');
    return true;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    toast.info('Signed out');
  }, []);

  const addItem = useCallback(async (item: NewItemInput) => {
    if (!authUser) { toast.error('Please sign in'); return false; }
    const { error } = await supabase.from('items').insert({
      user_id: authUser.id,
      type: item.type,
      title: item.title,
      category: item.category,
      description: item.description,
      location: item.location,
      date: item.date,
      image_url: item.image_url ?? null,
    });
    if (error) { toast.error(error.message); return false; }
    toast.success('Item reported');
    await refreshItems();
    return true;
  }, [authUser, refreshItems]);

  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Item deleted');
    await refreshItems();
  }, [refreshItems]);

  const createClaim = useCallback(async (foundItemId: string, message: string) => {
    if (!authUser) { toast.error('Please sign in'); return false; }
    const { error } = await supabase.from('claims').insert({
      found_item_id: foundItemId,
      claimant_id: authUser.id,
      message,
    });
    if (error) {
      toast.error(error.code === '23505' ? 'You already submitted a claim for this item.' : error.message);
      return false;
    }
    toast.success('Claim submitted — an admin will review it shortly');
    await refreshClaims();
    return true;
  }, [authUser, refreshClaims]);

  const reviewClaim = useCallback(async (claimId: string, status: 'approved' | 'rejected') => {
    if (!authUser) return;
    const { error } = await supabase
      .from('claims')
      .update({ status, reviewed_by: authUser.id, reviewed_at: new Date().toISOString() })
      .eq('id', claimId);
    if (error) { toast.error(error.message); return; }

    if (status === 'approved') {
      toast.success('Claim approved — both users have been notified in-app');
    } else {
      toast.success('Claim rejected');
    }
    await refreshClaims();
  }, [authUser, refreshClaims]);

  return (
    <AppContext.Provider value={{
      authUser, session, profile, loading,
      items, myClaims, claimsForReview,
      notifications,
      unreadCount: notifications.filter(n => !n.is_read).length,
      refreshItems, refreshClaims,
      refreshNotifications, markNotificationRead, markAllNotificationsRead,
      signIn, signUp, signOut,
      addItem, deleteItem,
      createClaim, reviewClaim,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}