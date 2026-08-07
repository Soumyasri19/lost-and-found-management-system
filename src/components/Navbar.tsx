import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Search, Menu, X, LogOut, LayoutDashboard, Plus } from 'lucide-react';
import { useState } from 'react';
import NotificationBell from '@/components/NotificationBell';

export default function Navbar() {
  const { profile, signOut } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 glass-card border-b">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-primary">
          <Search className="h-5 w-5" />
          Lost&Found
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild><Link to="/items">Browse Found</Link></Button>
          {profile && (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/report">Report Item</Link></Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to={profile.role === 'admin' ? '/admin' : '/dashboard'}>
                  <LayoutDashboard className="h-4 w-4 mr-1" /> Dashboard
                </Link>
              </Button>
            </>
          )}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {profile ? (
            <div className="flex items-center gap-3">
              <NotificationBell />
              <span className="text-sm text-muted-foreground">Hi, <span className="font-medium text-foreground">{profile.username}</span></span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" /> Logout
              </Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/login">Login</Link></Button>
              <Button size="sm" asChild><Link to="/register">Register</Link></Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t bg-card px-4 py-3 space-y-2">
          <Button variant="ghost" className="w-full justify-start" asChild onClick={() => setOpen(false)}>
            <Link to="/items">Browse Found</Link>
          </Button>
          {profile && (
            <>
              <Button variant="ghost" className="w-full justify-start" asChild onClick={() => setOpen(false)}>
                <Link to="/report"><Plus className="h-4 w-4 mr-2" />Report Item</Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild onClick={() => setOpen(false)}>
                <Link to={profile.role === 'admin' ? '/admin' : '/dashboard'}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />Dashboard
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => { handleLogout(); setOpen(false); }}>
                <LogOut className="h-4 w-4 mr-2" />Logout
              </Button>
            </>
          )}
          {!profile && (
            <>
              <Button variant="ghost" className="w-full justify-start" asChild onClick={() => setOpen(false)}>
                <Link to="/login">Login</Link>
              </Button>
              <Button className="w-full justify-start" asChild onClick={() => setOpen(false)}>
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
