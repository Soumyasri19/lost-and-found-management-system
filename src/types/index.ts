export type UserRole = 'admin' | 'user';

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  email: string;
  phone: string | null;
  role: UserRole;
}

export type ItemType = 'lost' | 'found';
export type ItemCategory = 'Electronics' | 'Documents' | 'Accessories' | 'Clothing' | 'Keys' | 'Bags' | 'Other';
export const CATEGORIES: ItemCategory[] = ['Electronics', 'Documents', 'Accessories', 'Clothing', 'Keys', 'Bags', 'Other'];

export interface Item {
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  category: string;
  description: string;
  location: string;
  date: string;
  image_url: string | null;
  is_resolved: boolean;
  created_at: string;
}

export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface Claim {
  id: string;
  found_item_id: string;
  claimant_id: string;
  message: string | null;
  status: ClaimStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  claim_id: string | null;
  item_id: string | null;
  item_title: string;
  finder_username: string;
  finder_email: string;
  finder_phone: string | null;
  finder_location: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
}
