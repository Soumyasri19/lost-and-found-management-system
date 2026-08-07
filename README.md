# 🔎 Lost & Found Management System

A web-based Lost & Found Management System that helps users report lost or found items, search for reported items, submit claims, and securely connect item owners with finders.

The application provides separate user and admin workflows to make the process of reporting, matching, and recovering lost items simple and organized.

---

## 🌐 Project Overview

Losing an important item can be stressful, while finding an item without knowing its owner can also be challenging.

This project provides a centralized platform where users can:

- Report lost items
- Report found items
- Search and browse reported items
- Specify the exact location using an interactive map
- Upload images of items
- Submit claims for items they believe belong to them
- Receive notifications after claim approval

Administrators can manage users, monitor reported items, review claims, and approve or reject requests.

---

## ✨ Features

### 👤 User Features

- User registration and login
- Secure authentication
- Report lost items
- Report found items
- Add item title and description
- Select item category
- Select date
- Add location using Mapbox
- Upload item images
- Browse found items
- View item details
- Submit claim requests
- View claim status
- Receive email notifications after claim approval

### 🗺️ Location & Map

The application integrates **Mapbox** to provide:

- Interactive maps
- Location search
- Map-based location selection
- Draggable location marker
- Reverse geocoding
- Automatic location information

### 🔐 Claim & Verification System

To protect the reporter's personal information:

1. A user submits a claim for an item.
2. The claim is sent to the administrator.
3. The administrator reviews the claim.
4. The administrator can approve or reject the claim.
5. Contact details are revealed only after approval.
6. The approved user receives a notification/email.

### 👨‍💼 Admin Dashboard

The admin dashboard provides:

- Total registered users
- Total reported items
- Lost item count
- Found item count
- Pending claim reviews
- Recent reports
- Registered users
- Claim approval/rejection
- Item management

---

## 🛠️ Tech Stack

### Frontend

- React.js
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- Lucide Icons

### Backend & Database

- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Edge Functions

### APIs & Integrations

- Mapbox
- Mapbox Geocoding API
- Email notification integration

### Development Tools

- IntelliJ IDEA / VS Code
- Git
- GitHub
- npm

---

## 🏗️ Application Architecture

```text
                    ┌─────────────────────┐
                    │       User          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   React Frontend    │
                    │  TypeScript + Vite  │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
       ┌───────────┐    ┌────────────┐    ┌────────────┐
       │ Supabase  │    │  Mapbox    │    │   Email    │
       │ Auth/DB   │    │    API     │    │Notification│
       └───────────┘    └────────────┘    └────────────┘
             │
             ▼
       ┌───────────────┐
       │  PostgreSQL   │
       │   Database    │
       └───────────────┘
