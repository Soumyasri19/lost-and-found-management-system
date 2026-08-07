import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { Search, FileText, Shield, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import ItemCard from '@/components/ItemCard';

export default function Home() {
  const { items } = useApp();
  const recentItems = items.slice(0, 3);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="gradient-hero py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Lost Something?<br />
              <span className="text-gradient">We Help You Find It.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              A centralized platform to report, search, and recover lost items. 
              Report what you've lost or found and let our matching system do the rest.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link to="/report">Report an Item <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/items">Browse All Items</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: FileText, title: 'Report', desc: 'Submit details about your lost or found item with images and location.' },
              { icon: Search, title: 'Match', desc: 'Our system automatically matches found items with lost reports.' },
              { icon: Shield, title: 'Recover', desc: 'Get notified when a match is found and connect with the reporter.' },
            ].map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15, duration: 0.5 }}
                className="text-center p-8 rounded-2xl bg-card border hover:shadow-lg transition-shadow"
              >
                <div className="inline-flex p-4 rounded-2xl bg-primary/10 text-primary mb-4">
                  <f.icon className="h-8 w-8" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Items */}
      {recentItems.length > 0 && (
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-3xl font-bold">Recent Reports</h2>
              <Button variant="ghost" asChild>
                <Link to="/items">View all <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {recentItems.map(item => <ItemCard key={item.id} item={item} />)}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 Lost & Found Management System — Mini Project by T. Soumya Sri</p>
        </div>
      </footer>
    </div>
  );
}
