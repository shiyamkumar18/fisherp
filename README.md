# fisherp

🐟 Fish Trading Management SaaS
📌 Product Overview

Fish Trading Management SaaS is a subscription-based web and mobile application designed for mediators who:

Buy fish from boats, auctions, or buckets

Divide fish into standard 37 KG packages

Sell packages to buyers

Track real profit including expenses

Monitor pending payments

Analyze monthly, yearly, auction-wise and location-wise performance

The system ensures accurate financial tracking by including all operational expenses in purchase cost calculation.

🏗 System Architecture
High-Level Architecture
Frontend (React + PWA)
        ↓
Django REST API (Business Logic Layer)
        ↓
PostgreSQL Database
        ↓
Payment Gateway (Razorpay)
Architecture Type

Multi-tenant SaaS

Single database

Company-based data isolation

Subscription-based access control

Each mediator = One Company

All data is filtered by company_id.

🧱 Database Design
1️⃣ Company

id

name

phone

subscription_plan

subscription_end

is_active

Each mediator is stored as a Company.

2️⃣ User

id

name

phone

role

company (ForeignKey)

3️⃣ Fish

id

name

standard_package_weight (default = 37 KG)

company

4️⃣ Buyer

id

name

phone

company

5️⃣ PurchaseBatch

Represents one boat/auction/bucket purchase.

Fields:

id

purchase_type (Boat / Auction / Bucket)

reference_name

place_of_buying

fish (ForeignKey)

number_of_packages

total_weight (auto = packages × 37)

price_per_kg

fish_cost (auto)

labour_cost

ice_cost

transport_cost

commission_cost

other_cost

total_expense (auto)

actual_cost_per_kg (auto)

amount_paid

pending_amount (auto)

date

company

6️⃣ Package

Auto-created after purchase.

id

batch (ForeignKey)

package_number

weight (37 KG)

actual_cost_per_kg

is_sold

7️⃣ Sale

id

package (ForeignKey)

fish (ForeignKey)

buyer (ForeignKey)

selling_price_per_kg

total_amount (auto)

amount_received

pending_amount (auto)

profit (auto)

date

company

⚙️ Core Business Logic
🛥 Purchase Flow

User enters:

Purchase Type

Place of Buying

Fish

Number of Packages

Price per KG

Expenses

System calculates:

Total Weight = Packages × 37
Fish Cost = Total Weight × Price per KG
Total Expense = Fish Cost + Labour + Ice + Transport + Commission + Other
Actual Cost per KG = Total Expense ÷ Total Weight
Pending Amount = Total Expense - Amount Paid

System auto-creates packages.

📦 Package Logic

For each purchase:

Create N packages

Each package weight = 37 KG

Each package cost per KG = actual_cost_per_kg

Mark is_sold = False

🛒 Sale Flow

User selects:

Available Package

Buyer

Selling Price per KG

System calculates:

Total Sale Amount = 37 × Selling Price
Profit = (Selling Price - Actual Cost per KG) × 37
Pending = Total Sale Amount - Amount Received

System marks package as sold.

📊 Dashboard Features
Overview Cards

Total Sales

Total Purchase

Net Profit / Loss

Buyer Pending

Fisherman Pending

Remaining Packages

Loose Stock Value

Filters

Today

This Month

This Year

Custom Date Range

By Auction

By Place of Buying

By Fish

Analytics

Monthly profit chart

Yearly profit chart

Auction-wise profit

Location-wise performance

Fish-wise profit report

💰 Financial Features

Real cost calculation (including expenses)

Profit per package

Profit per batch

Monthly profit

Yearly profit

Buyer ledger

Fisherman ledger

Pending tracking

🔐 Subscription System
Features

Free trial (optional)

Monthly plan

Yearly plan

Razorpay integration

Expiry lock middleware

Renewal system

Access Control

If:

today > subscription_end

Then:

API returns 403

Dashboard locked

Show renewal screen

📱 UI Structure
Mobile

Card-based dashboard

Simple purchase form

Live cost preview

Clean minimal layout

Large buttons

Web

Sidebar navigation

Data tables with filters

Charts

Report exports (future)

🚀 Development Roadmap
Phase 1 – Core Trading (4–6 Weeks)

Authentication

Company model

Fish & Buyer master

Purchase system

Package automation

Sales system

Basic dashboard

Phase 2 – Analytics (2–3 Weeks)

Monthly reports

Auction analytics

Location analytics

Charts

Profit breakdown

Phase 3 – Subscription Monetization (2 Weeks)

Plan model

Razorpay integration

Expiry middleware

Renewal page

Phase 4 – Optimization

Redis caching

Performance tuning

PWA support

Backup system

Phase 5 – Advanced Features

Multi-user per company

Accountant role

SMS reminders

Partial package selling

Mobile app

Multi-location support

🏢 Deployment Architecture
Nginx
   ↓
Gunicorn
   ↓
Django
   ↓
PostgreSQL

Frontend deployed via:

Vercel OR

Nginx static hosting

Hosting recommended:

DigitalOcean

💡 Key Business Advantages

Accurate profit calculation

Expense-inclusive cost tracking

Standardized 37 KG packaging

Location-based performance tracking

Auction analytics

Subscription-based recurring revenue

🎯 Product Positioning

This system is:

Fish Trading ERP Lite

Designed for mediators

Expense-aware profit engine

Package-based inventory system

SaaS-enabled business platform

Mobile-first solution
