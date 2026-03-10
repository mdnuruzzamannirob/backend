# 📚 Library Management System API

A comprehensive **Library Management System** RESTful API built with **Node.js**, **Express**, **TypeScript**, and **MongoDB**. Features include book management, member management, borrowing/returning books, fine management, online payments (Stripe), book reservations, file uploads (Cloudinary), email notifications, cron jobs, and admin reports/analytics.

---

## 🚀 Features

### Core Modules

- **Authentication** — Register, login, JWT access/refresh tokens, password change, forgot/reset password, logout
- **Users** — User CRUD, profile management, role-based access (user/admin)
- **Categories** — Book category management with soft deletes
- **Books** — Full book inventory with ISBN, search/filter, pagination, cover image upload
- **Members** — Membership management (student/standard/premium), expiry tracking
- **Borrowing** — Borrow/return books with MongoDB transactions, renewals, lost book handling
- **Fines** — Auto-generated overdue fines, manual/online payment, waive support
- **Reservations** — Book reservation queue, auto-notification when available
- **Payments** — Stripe payment integration + manual (cash/card) payments
- **Reports** — Dashboard stats, popular books, active members, borrow trends, revenue

### Advanced Features

- **Cron Jobs** — Automated overdue detection, fine calculation, membership expiry checks, reservation expiry
- **File Uploads** — Multer + Cloudinary for book cover images (JPEG, PNG, WebP, GIF)
- **Email System** — Nodemailer SMTP with templates for welcome, overdue reminders, payment confirmations, password reset, membership expiry
- **Payment Processing** — Stripe payment intents with webhook handling + manual payment recording
- **Rate Limiting** — General API limit (100 req/15min) + stricter auth limit (20 req/15min)
- **Security** — Helmet, CORS, bcrypt password hashing, JWT authentication, input validation (Zod)
- **Logging** — Winston with daily rotating file logs + colorized console output
- **Error Handling** — Centralized error handler for Zod, Mongoose, JWT, and application errors
- **Soft Deletes** — All major entities support soft deletion
- **Pagination & Sorting** — All list endpoints with meta information
- **Database Transactions** — Borrow/return operations use MongoDB sessions

---

## 📁 Project Structure

```
src/
├── app.ts                    # Express app setup & middleware
├── server.ts                 # Server startup & graceful shutdown
├── config/
│   ├── index.ts              # Environment configuration
│   ├── cloudinary.ts         # Cloudinary config
│   └── stripe.ts             # Stripe config
├── db/
│   └── index.ts              # MongoDB connection
├── errors/
│   └── AppError.ts           # Custom error class
├── jobs/
│   └── cronJobs.ts           # Scheduled tasks (node-cron)
├── middleware/
│   ├── auth.ts               # JWT authentication & role authorization
│   ├── errorHandler.ts       # Global error handler
│   ├── httpLogger.ts         # Morgan HTTP logger
│   ├── notFound.ts           # 404 handler
│   ├── upload.ts             # Multer file upload config
│   └── validate.ts           # Zod request validation
├── modules/
│   ├── auth/                 # Authentication (register, login, password reset)
│   ├── user/                 # User management
│   ├── category/             # Book categories
│   ├── book/                 # Book inventory
│   ├── member/               # Library members
│   ├── borrow/               # Borrow/return operations
│   ├── fine/                 # Fine management
│   ├── reservation/          # Book reservations
│   ├── payment/              # Payment processing (Stripe + manual)
│   └── report/               # Analytics & reports
├── routes/
│   └── index.ts              # Route aggregator
├── scripts/
│   └── seed.ts               # Database seeder
├── types/
│   └── express.d.ts          # Express type augmentation
└── utils/
    ├── catchAsync.ts         # Async error wrapper
    ├── email.ts              # Email service & templates
    ├── fileUpload.ts         # Cloudinary upload/delete helpers
    ├── logger.ts             # Winston logger
    ├── pick.ts               # Object pick utility
    └── sendResponse.ts       # Standardized API response
```

---

## ⚙️ Prerequisites

- **Node.js** >= 18.x
- **MongoDB** >= 6.x
- **npm** or **yarn**

### Optional (for full features)

- **Stripe** account (for payment processing)
- **Cloudinary** account (for image uploads)
- **Gmail / SMTP** account (for email notifications)

---

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/mdnuruzzamannirob/backend.git
cd backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=mongodb://localhost:27017/library_db
JWT_ACCESS_SECRET=your_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=Library Management <noreply@library.com>

# Password Reset
PASSWORD_RESET_EXPIRES_IN=10m

# Client URL
CLIENT_URL=http://localhost:3000
```

### 4. Seed the database

```bash
npm run seed
```

This creates:

- **Admin user** — `admin@library.com` / `Admin@123`
- **Default categories** — Fiction, Non-Fiction, Science, Technology, History, Biography, Children, Reference

### 5. Start the server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

---

## 📡 API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Health Check

| Method | Endpoint  | Description         |
| ------ | --------- | ------------------- |
| GET    | `/health` | Server health check |

### Authentication

| Method | Endpoint                 | Auth | Description                                    |
| ------ | ------------------------ | ---- | ---------------------------------------------- |
| POST   | `/auth/register`         | ❌   | Register (sends email verification OTP)        |
| POST   | `/auth/verify-email`     | ❌   | Verify email with OTP → returns tokens         |
| POST   | `/auth/resend-otp`       | ❌   | Resend OTP (email_verification/password_reset) |
| POST   | `/auth/login`            | ❌   | Login (requires verified email)                |
| POST   | `/auth/refresh-token`    | ❌   | Refresh access token                           |
| POST   | `/auth/change-password`  | ✅   | Change password                                |
| POST   | `/auth/forgot-password`  | ❌   | Send password reset OTP to email               |
| POST   | `/auth/verify-reset-otp` | ❌   | Verify reset OTP → returns resetToken          |
| POST   | `/auth/reset-password`   | ❌   | Reset password with resetToken                 |
| POST   | `/auth/logout`           | ✅   | Logout                                         |

### Users

| Method | Endpoint     | Auth          | Description        |
| ------ | ------------ | ------------- | ------------------ |
| GET    | `/users/me`  | ✅ User/Admin | Get own profile    |
| PATCH  | `/users/me`  | ✅ User/Admin | Update own profile |
| GET    | `/users`     | ✅ Admin      | List all users     |
| POST   | `/users`     | ✅ Admin      | Create user        |
| GET    | `/users/:id` | ✅ Admin      | Get user by ID     |
| PATCH  | `/users/:id` | ✅ Admin      | Update user        |
| DELETE | `/users/:id` | ✅ Admin      | Soft delete user   |

### Categories

| Method | Endpoint          | Auth          | Description          |
| ------ | ----------------- | ------------- | -------------------- |
| GET    | `/categories`     | ✅ User/Admin | List all categories  |
| POST   | `/categories`     | ✅ Admin      | Create category      |
| GET    | `/categories/:id` | ✅ User/Admin | Get category         |
| PATCH  | `/categories/:id` | ✅ Admin      | Update category      |
| DELETE | `/categories/:id` | ✅ Admin      | Soft delete category |

### Books

| Method | Endpoint           | Auth          | Description                           |
| ------ | ------------------ | ------------- | ------------------------------------- |
| GET    | `/books`           | ✅ User/Admin | List books (search, filter, paginate) |
| POST   | `/books`           | ✅ Admin      | Create book                           |
| GET    | `/books/:id`       | ✅ User/Admin | Get book details                      |
| PATCH  | `/books/:id`       | ✅ Admin      | Update book                           |
| DELETE | `/books/:id`       | ✅ Admin      | Soft delete book                      |
| PATCH  | `/books/:id/cover` | ✅ Admin      | Upload cover image                    |

**Query Parameters (GET /books):**

- `page` — Page number (default: 1)
- `limit` — Items per page (default: 10)
- `sortBy` — Sort field (default: createdAt)
- `sortOrder` — asc / desc (default: desc)
- `search` — Search by title, author, ISBN
- `category` — Filter by category ID
- `language` — Filter by language
- `available` — Filter by availability (true/false)

### Members

| Method | Endpoint       | Auth          | Description        |
| ------ | -------------- | ------------- | ------------------ |
| GET    | `/members/me`  | ✅ User/Admin | Get own membership |
| GET    | `/members`     | ✅ Admin      | List all members   |
| POST   | `/members`     | ✅ Admin      | Create member      |
| GET    | `/members/:id` | ✅ Admin      | Get member         |
| PATCH  | `/members/:id` | ✅ Admin      | Update member      |
| DELETE | `/members/:id` | ✅ Admin      | Soft delete member |

### Borrowing

| Method | Endpoint              | Auth          | Description             |
| ------ | --------------------- | ------------- | ----------------------- |
| GET    | `/borrows/my-history` | ✅ User/Admin | Own borrow history      |
| GET    | `/borrows/overdue`    | ✅ Admin      | List overdue records    |
| POST   | `/borrows`            | ✅ Admin      | Issue a book            |
| GET    | `/borrows`            | ✅ Admin      | List all borrow records |
| GET    | `/borrows/:id`        | ✅ Admin      | Get borrow record       |
| PATCH  | `/borrows/:id/return` | ✅ Admin      | Return a book           |
| PATCH  | `/borrows/:id/renew`  | ✅ Admin      | Renew a borrow          |
| PATCH  | `/borrows/:id/lost`   | ✅ Admin      | Mark book as lost       |

### Fines

| Method | Endpoint           | Auth          | Description       |
| ------ | ------------------ | ------------- | ----------------- |
| GET    | `/fines/me`        | ✅ User/Admin | Own fines         |
| GET    | `/fines`           | ✅ Admin      | List all fines    |
| GET    | `/fines/:id`       | ✅ Admin      | Get fine details  |
| PATCH  | `/fines/:id/pay`   | ✅ Admin      | Mark fine as paid |
| PATCH  | `/fines/:id/waive` | ✅ Admin      | Waive a fine      |

### Reservations

| Method | Endpoint                   | Auth          | Description           |
| ------ | -------------------------- | ------------- | --------------------- |
| GET    | `/reservations/me`         | ✅ User/Admin | Own reservations      |
| POST   | `/reservations`            | ✅ User/Admin | Reserve a book        |
| GET    | `/reservations`            | ✅ Admin      | List all reservations |
| PATCH  | `/reservations/:id/cancel` | ✅ User/Admin | Cancel reservation    |

### Payments

| Method | Endpoint            | Auth          | Description                  |
| ------ | ------------------- | ------------- | ---------------------------- |
| GET    | `/payments/me`      | ✅ User/Admin | Own payment history          |
| POST   | `/payments/stripe`  | ✅ User/Admin | Create Stripe payment intent |
| POST   | `/payments/manual`  | ✅ Admin      | Record cash/card payment     |
| GET    | `/payments`         | ✅ Admin      | List all payments            |
| POST   | `/payments/webhook` | ❌            | Stripe webhook               |

### Reports & Analytics

| Method | Endpoint                         | Auth     | Description              |
| ------ | -------------------------------- | -------- | ------------------------ |
| GET    | `/reports/dashboard`             | ✅ Admin | Dashboard summary stats  |
| GET    | `/reports/popular-books`         | ✅ Admin | Most borrowed books      |
| GET    | `/reports/active-members`        | ✅ Admin | Most active members      |
| GET    | `/reports/category-distribution` | ✅ Admin | Books by category        |
| GET    | `/reports/borrow-trends`         | ✅ Admin | Borrowing trends (daily) |
| GET    | `/reports/revenue`               | ✅ Admin | Revenue report           |
| GET    | `/reports/overdue`               | ✅ Admin | Overdue books report     |

---

## ⏰ Cron Jobs (Scheduled Tasks)

| Schedule    | Task                | Description                                  |
| ----------- | ------------------- | -------------------------------------------- |
| Daily 00:00 | Mark Overdue        | Detects overdue books & creates fines        |
| Daily 03:00 | Update Fines        | Recalculates overdue fine amounts daily      |
| Daily 09:00 | Overdue Reminders   | Sends email reminders for overdue books      |
| Daily 08:00 | Membership Expiry   | Notifies members 7 days before expiry        |
| Daily 02:00 | Deactivate Expired  | Auto-deactivates expired memberships         |
| Hourly      | Expire Reservations | Expires uncollected ready reservations (48h) |

---

## 💳 Payment Flow

### Stripe Online Payment

1. User calls `POST /payments/stripe` with `fineId`
2. Server creates a Stripe PaymentIntent and returns `clientSecret`
3. Frontend uses Stripe.js to confirm payment with the `clientSecret`
4. Stripe sends webhook to `POST /payments/webhook`
5. Server marks payment & fine as paid, sends confirmation email

### Manual Payment (Cash/Card)

1. Admin calls `POST /payments/manual` with `fineId` and `method` (cash/card)
2. Server records payment, marks fine as paid, sends confirmation email

---

## 📧 Email Notifications

| Event             | Recipient | Template                    |
| ----------------- | --------- | --------------------------- |
| Registration      | New user  | Welcome email               |
| Password Reset    | User      | Reset link (10min expiry)   |
| Overdue Book      | Member    | Daily overdue reminder      |
| Fine Created      | Member    | Fine notification           |
| Payment Confirmed | Member    | Payment receipt             |
| Membership Expiry | Member    | 7-day warning               |
| Reservation Ready | Member    | Book available notification |

---

## 📤 File Upload

- **Endpoint:** `PATCH /books/:id/cover`
- **Method:** Multipart form data with `coverImage` field
- **Supported formats:** JPEG, PNG, WebP, GIF
- **Max size:** 5MB
- **Storage:** Cloudinary (auto-optimized, resized to 800x1200 max)

---

## 🔒 Security

- **Helmet** — Security HTTP headers
- **CORS** — Configurable cross-origin resource sharing
- **Rate Limiting** — 100 requests/15min (API), 20 requests/15min (auth)
- **bcrypt** — Password hashing + OTP hashing (configurable salt rounds)
- **JWT** — Access token (15min) + HttpOnly refresh token cookie (7days)
- **OTP** — 6-digit numeric, bcrypt-hashed, MongoDB TTL auto-expiry (10min)
- **Zod** — Request body/params/query validation
- **Soft Deletes** — Data is never permanently deleted
- **Input Sanitization** — Body size limits (10KB)

---

## 🔑 Authentication Flows

### Registration with Email Verification

```
POST /auth/register        → creates unverified user, sends OTP email
POST /auth/verify-email    → { email, otp } → verifies, sends welcome email, returns tokens
POST /auth/resend-otp      → { email, type: "email_verification" } → resend OTP
```

### Password Reset (OTP-based)

```
POST /auth/forgot-password   → { email } → sends OTP email
POST /auth/verify-reset-otp  → { email, otp } → returns { resetToken }
POST /auth/reset-password    → { resetToken, newPassword } → updates password
```

---

## 📊 API Response Format

### Success Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Books retrieved successfully",
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  },
  "data": [...]
}
```

### Error Response

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation error",
  "errors": [
    {
      "path": "body.email",
      "message": "Invalid email address"
    }
  ]
}
```

---

## 🧪 Scripts

| Script | Command         | Description                     |
| ------ | --------------- | ------------------------------- |
| Dev    | `npm run dev`   | Start with nodemon (hot reload) |
| Build  | `npm run build` | Compile TypeScript              |
| Start  | `npm start`     | Run compiled JS                 |
| Seed   | `npm run seed`  | Seed admin user & categories    |

---

## 🗂️ Tech Stack

| Technology             | Purpose             |
| ---------------------- | ------------------- |
| **Node.js**            | Runtime             |
| **Express 5**          | Web framework       |
| **TypeScript**         | Type safety         |
| **MongoDB**            | Database            |
| **Mongoose**           | ODM                 |
| **JWT**                | Authentication      |
| **Zod**                | Validation          |
| **bcryptjs**           | Password hashing    |
| **Winston**            | Logging             |
| **Morgan**             | HTTP logging        |
| **node-cron**          | Scheduled tasks     |
| **Multer**             | File uploads        |
| **Cloudinary**         | Cloud image storage |
| **Stripe**             | Payment processing  |
| **Nodemailer**         | Email service       |
| **Helmet**             | Security headers    |
| **express-rate-limit** | Rate limiting       |

---

## 📜 License

ISC

## 👤 Author

**Md. Nuruzzaman**
