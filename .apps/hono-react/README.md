# 

A production-ready Hono + React fullstack application with Drizzle ORM.

## Tech Stack

- **Runtime**: Bun
- **API**: Hono with RPC client
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: React + Vite
- **Testing**: Vitest
- **Deployment**: Vercel

## Getting Started

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env

# Run database migrations
bun db:push

# Start development server
bun dev
```

## Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch
```

## API Endpoints

### Product
- `GET /api/product` - List all product
- `GET /api/product/:id` - Get single product
- `POST /api/product` - Create product
- `PUT /api/product/:id` - Update product
- `DELETE /api/product/:id` - Delete product
### Customer
- `GET /api/customer` - List all customer
- `GET /api/customer/:id` - Get single customer
- `POST /api/customer` - Create customer
- `PUT /api/customer/:id` - Update customer
- `DELETE /api/customer/:id` - Delete customer
### Order
- `GET /api/order` - List all order
- `GET /api/order/:id` - Get single order
- `POST /api/order` - Create order
- `PUT /api/order/:id` - Update order
- `DELETE /api/order/:id` - Delete order
### OrderProduct
- `GET /api/order-product` - List all order_product
- `GET /api/order-product/:id` - Get single order_product
- `POST /api/order-product` - Create order_product
- `PUT /api/order-product/:id` - Update order_product
- `DELETE /api/order-product/:id` - Delete order_product
### User
- `GET /api/user` - List all user
- `GET /api/user/:id` - Get single user
- `POST /api/user` - Create user
- `PUT /api/user/:id` - Update user
- `DELETE /api/user/:id` - Delete user
### Session
- `GET /api/session` - List all session
- `GET /api/session/:id` - Get single session
- `POST /api/session` - Create session
- `PUT /api/session/:id` - Update session
- `DELETE /api/session/:id` - Delete session
### OauthAccount
- `GET /api/oauth-account` - List all oauth_account
- `GET /api/oauth-account/:id` - Get single oauth_account
- `POST /api/oauth-account` - Create oauth_account
- `PUT /api/oauth-account/:id` - Update oauth_account
- `DELETE /api/oauth-account/:id` - Delete oauth_account
### Profile
- `GET /api/profile` - List all profile
- `GET /api/profile/:id` - Get single profile
- `POST /api/profile` - Create profile
- `PUT /api/profile/:id` - Update profile
- `DELETE /api/profile/:id` - Delete profile
### Post
- `GET /api/posts` - List all posts
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
### UserType
- `GET /api/user-type` - List all user_type
- `GET /api/user-type/:id` - Get single user_type
- `POST /api/user-type` - Create user_type
- `PUT /api/user-type/:id` - Update user_type
- `DELETE /api/user-type/:id` - Delete user_type
### UserUserType
- `GET /api/user-user-type` - List all user_user_type
- `GET /api/user-user-type/:id` - Get single user_user_type
- `POST /api/user-user-type` - Create user_user_type
- `PUT /api/user-user-type/:id` - Update user_user_type
- `DELETE /api/user-user-type/:id` - Delete user_user_type

## Database Schema

### Product

| Column | Type | Nullable |
|--------|------|----------|
| id | number | NO |
| product_name | string | NO |

### Customer

| Column | Type | Nullable |
|--------|------|----------|
| id | number | NO |
| name | string | NO |

### Order

| Column | Type | Nullable |
|--------|------|----------|
| id | number | NO |
| customer_id | number | NO |

### OrderProduct

| Column | Type | Nullable |
|--------|------|----------|
| id | number | NO |
| order_id | number | NO |
| product_id | number | NO |

### User

| Column | Type | Nullable |
|--------|------|----------|
| id | string | NO |
| email | string | NO |
| username | string | NO |
| password_hash | string | YES |
| first_name | string | YES |
| last_name | string | YES |
| avatar_url | string | YES |
| email_verified | boolean | NO |
| created_at | Date | YES |
| updated_at | Date | YES |

### Session

| Column | Type | Nullable |
|--------|------|----------|
| id | string | NO |
| user_id | string | NO |
| expires_at | Date | NO |

### OauthAccount

| Column | Type | Nullable |
|--------|------|----------|
| id | number | NO |
| provider_id | string | NO |
| provider_user_id | string | NO |
| user_id | string | NO |

### Profile

| Column | Type | Nullable |
|--------|------|----------|
| id | number | NO |
| user_id | string | NO |
| bio | string | NO |
| created_at | Date | YES |
| updated_at | Date | YES |

### Post

| Column | Type | Nullable |
|--------|------|----------|
| id | number | NO |
| user_id | string | NO |
| title | string | NO |
| content | string | YES |
| created_at | Date | YES |
| updated_at | Date | YES |

### UserType

| Column | Type | Nullable |
|--------|------|----------|
| id | number | NO |
| name | string | NO |
| created_at | Date | YES |
| updated_at | Date | YES |
| deleted_at | Date | YES |

### UserUserType

| Column | Type | Nullable |
|--------|------|----------|
| id | number | NO |
| user_id | string | NO |
| user_type_id | number | NO |
| created_at | Date | YES |
| updated_at | Date | YES |
| deleted_at | Date | YES |

## Deployment

Deploy to Vercel:

```bash
vercel
```

## Project Structure

```
├── api/
│   ├── index.ts          # API entry point
│   ├── db/
│   │   ├── index.ts      # Database connection
│   │   └── schema.ts     # Drizzle schema
│   └── routes/           # Route handlers
├── src/
│   ├── App.tsx           # React app
│   ├── main.tsx          # Entry point
│   └── styles/           # Styles
├── tests/                # Test files
├── drizzle.config.ts     # Drizzle config
├── vite.config.ts        # Vite config
└── vitest.config.ts      # Vitest config
```