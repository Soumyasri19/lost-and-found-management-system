import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CATEGORIES, ItemCategory, ItemType } from '@/types';
import Navbar from '@/components/Navbar';
import MapLocationPicker from '@/components/MapLocationPicker';

export default function ReportItem() {
  const { profile, addItem } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    type: 'lost' as ItemType,
    title: '',
    category: '' as ItemCategory | '',
    description: '',
    location: '',
    date: '',
    imageUrl: '',
  });

  if (!profile) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) return;
    const ok = await addItem({
      type: form.type,
      title: form.title,
      category: form.category as ItemCategory,
      description: form.description,
      location: form.location,
      date: form.date,
      image_url: form.imageUrl || null,
    });
    if (ok) navigate(form.type === 'lost' ? '/dashboard' : '/items');
  };

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => update('imageUrl', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto py-10 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Report an Item</CardTitle>
            <CardDescription>Fill in the details about the lost or found item</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Item Type</Label>
                  <Select value={form.type} onValueChange={v => update('type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lost">Lost</SelectItem>
                      <SelectItem value="found">Found</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => update('category', v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Item Title</Label>
                <Input placeholder="e.g., Blue Laptop Bag" value={form.title} onChange={e => update('title', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Describe the item in detail..." value={form.description} onChange={e => update('description', e.target.value)} required rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <MapLocationPicker value={form.location} onChange={v => update('location', v)} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={e => update('date', e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Upload Image</Label>
                <Input type="file" accept="image/*" onChange={handleImageUpload} />
                {form.imageUrl && (
                  <img src={form.imageUrl} alt="Preview" className="h-32 w-32 object-cover rounded-lg mt-2" />
                )}
              </div>
              <Button type="submit" className="w-full" size="lg">Submit Report</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
