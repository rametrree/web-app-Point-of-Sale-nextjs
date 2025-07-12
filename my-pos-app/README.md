# KNC Point of Sale (POS) Web Application

A modern and efficient Point of Sale (POS) web application built with Next.js, designed to streamline sales operations, product management, and customer interactions.

## Features

*   **User Authentication:** Secure login for staff.
*   **Product Management:** Add, view, update, and delete products with stock management.
*   **Customer Management:** Manage customer details, including membership status.
*   **Sales & Transactions:**
    *   Barcode scanning (via camera or external scanner) for quick product lookup.
    *   Real-time stock validation during sales.
    *   Member discount calculation.
    *   Payment processing and change calculation.
*   **Reporting:** Basic sales reporting (e.g., daily/monthly sales).
*   **Receipt Printing:** Generate and print professional-looking delivery notes/receipts.

## Technologies Used

*   **Frontend:**
    *   [Next.js](https://nextjs.org/) (React Framework)
    *   [TypeScript](https://www.typescriptlang.org/)
    *   [Tailwind CSS](https://tailwindcss.com/) (for styling)
    *   [html5-qrcode](https://www.npmjs.com/package/html5-qrcode) (for barcode scanning)
*   **Backend:**
    *   Next.js API Routes
    *   [Prisma](https://www.prisma.io/) (ORM for database interaction)
    *   [PostgreSQL](https://www.postgresql.org/) (Database - configurable via Prisma)
    *   [bcryptjs](https://www.npmjs.com/package/bcryptjs) (for password hashing)
    *   [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) (for authentication)

## Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

*   Node.js (LTS version recommended)
*   npm or Yarn
*   A PostgreSQL database instance

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/rametrree/web-app-Point-of-Sale-nextjs.git
    cd web-app-Point-of-Sale-nextjs/my-pos-app
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Database Setup

1.  **Configure your database:**
    Create a `.env` file in the `my-pos-app` directory (if it doesn't exist) and add your PostgreSQL database URL:
    ```
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME?schema=public"
    ```
    Example: `DATABASE_URL="postgresql://postgres:password@localhost:5432/mypostestdb?schema=public"`

2.  **Run Prisma Migrations:**
    Apply the database schema and create tables:
    ```bash
    npx prisma migrate dev --name init_database
    ```
    *Note: If you already have migrations, you might just run `npx prisma migrate deploy`.*

3.  **Seed the database (Optional):**
    Populate the database with some initial data (e.g., admin user, sample products):
    ```bash
    npx prisma db seed
    ```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Endpoints

The application uses Next.js API Routes for its backend. Key API endpoints include:

*   `/api/auth/login`: User authentication.
*   `/api/products`: Product management (CRUD).
*   `/api/customers`: Customer management (CRUD).
*   `/api/sales`: Process sales transactions.
*   `/api/reports/sales`: Generate sales reports.
*   `/api/users`: User management.

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

This project is open-source and available under the [MIT License](https://opensource.org/licenses/MIT).