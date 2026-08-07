import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { MapPin, Calendar, Package, ArrowLeft, Hand, Lock, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Item, Profile, Claim } from '@/types';

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, items, myClaims, createClaim } = useApp();

  const [item, setItem] = useState<Item | null>(null);
  const [reporter, setReporter] = useState<Pick<Profile, 'username' | 'email' | 'phone'> | null>(null);
  const [claimMsg, setClaimMsg] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Find in cached list first (already privacy-masked via items_public)
  useEffect(() => {
    if (!id) return;
    const cached = items.find(i => i.id === id);
    if (cached) setItem(cached);
    else {
      // fallback fetch
      supabase.from('items_public' as any).select('*').eq('id', id).maybeSingle()
        .then(({ data }) => setItem((data as unknown as Item) ?? null));
    }
  }, [id, items]);

  // Determine privacy state
  const isOwner = !!item && !!profile && item.user_id === profile.user_id;
  const isAdmin = profile?.role === 'admin';
  const myClaim: Claim | undefined = myClaims.find(c => c.found_item_id === id);
  const claimApproved = myClaim?.status === 'approved';
  const canSeeFullContact = isOwner || isAdmin || claimApproved;

  // Load reporter contact info only when allowed
  useEffect(() => {
    if (!item || !canSeeFullContact) { setReporter(null); return; }
    supabase
      .from('profiles')
      .select('username, email, phone')
      .eq('user_id', item.user_id)
      .maybeSingle()
      .then(({ data }) => setReporter(data as any));
  }, [item, canSeeFullContact]);

  if (!item) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto py-20 text-center">
          <p className="text-xl text-muted-foreground">Item not found or not visible to you.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate('/items')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </div>
      </div>
    );
  }

  const submitClaim = async () => {
    setSubmitting(true);
    const ok = await createClaim(item.id, claimMsg);
    setSubmitting(false);
    if (ok) { setDialogOpen(false); setClaimMsg(''); }
  };

  const showClaimButton = profile && item.type === 'found' && !isOwner && !isAdmin && !item.is_resolved;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto py-10 px-4">
        <Button variant="ghost" className="mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-2xl overflow-hidden bg-muted flex items-center justify-center aspect-square">
            {item.image_url ? (
              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <Package className="h-24 w-24 text-muted-foreground/30" />
            )}
          </div>

          <div className="space-y-6">
            <div>
              <Badge className={`mb-3 ${item.type === 'lost' ? 'bg-lost text-lost-foreground' : 'bg-found text-found-foreground'}`}>
                {item.type === 'lost' ? 'Lost Item' : 'Found Item'}
              </Badge>
              <h1 className="font-display text-3xl font-bold">{item.title}</h1>
              <Badge variant="secondary" className="mt-2">{item.category}</Badge>
              {item.is_resolved && <Badge className="ml-2 bg-found text-found-foreground">Resolved</Badge>}
            </div>

            <p className="text-muted-foreground leading-relaxed">{item.description}</p>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{item.location}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{item.date}</span>
              </div>
            </div>

            {/* Reporter card — privacy-aware */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-display font-semibold">Reporter Information</h3>
                {canSeeFullContact && reporter ? (
                  <div className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> {reporter.username}</div>
                    <div><span className="text-muted-foreground">Email:</span> {reporter.email}</div>
                    {reporter.phone && <div><span className="text-muted-foreground">Phone:</span> {reporter.phone}</div>}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground flex items-start gap-2">
                    <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Contact details are hidden until your claim is approved by an admin.</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Claim button or status */}
            {showClaimButton && !myClaim && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="w-full">
                    <Hand className="h-4 w-4 mr-2" /> This is mine — submit a claim
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Claim this item</DialogTitle>
                    <DialogDescription>
                      An admin will review your claim. Once approved, the finder's contact details will be sent to you by email.
                    </DialogDescription>
                  </DialogHeader>
                  <Textarea
                    placeholder="Describe how you can identify this item (color, marks, contents...)"
                    value={claimMsg}
                    onChange={e => setClaimMsg(e.target.value)}
                    rows={4}
                  />
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={submitClaim} disabled={submitting || claimMsg.trim().length < 5}>
                      {submitting ? 'Submitting...' : 'Submit Claim'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {myClaim && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  {myClaim.status === 'pending' && <><Clock className="h-5 w-5 text-primary" /><span>Your claim is awaiting admin review.</span></>}
                  {myClaim.status === 'approved' && <><CheckCircle2 className="h-5 w-5 text-found" /><span>Your claim was approved! Contact details are above. Check your email too.</span></>}
                  {myClaim.status === 'rejected' && <><XCircle className="h-5 w-5 text-destructive" /><span>Your claim was rejected.</span></>}
                </CardContent>
              </Card>
            )}

            {!profile && item.type === 'found' && (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link> to claim this item if it belongs to you.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}