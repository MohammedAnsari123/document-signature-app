# Document Signature App

## 2️⃣ Project Overview

### 2.1 Description
The Document Signature App is a secure, web-based platform that allows users to upload, manage, share, and electronically sign PDF documents. It is designed for individuals and organizations who need a reliable, paperless wa to request and collect signatures on important documents, while maintaining a clear history of actions.

### 2.2 Problem Statement
Traditional manual document signing is slow, inefficient, and prone to logistical bottlenecks. Printing, signing, scanning, and emailing documents back and forth wastes time and resources. Furthermore, standard email attachments lack proper auditability, making it difficult to verify who signed a document and when, while increasing the risk of unauthorized document tampering or forgery.

### 2.3 Solution
This application solves these issues by providing a centralized digital workflow. It ensures **secure uploads** of PDF documents, enables intuitive **digital signatures** via a drag-and-drop interface, and maintains a strict **audit trail** tracking every action (upload, sign, share, reject). It also introduces **token-based public signing**, allowing external users to securely sign documents without needing an account.

---

## 3️⃣ Key Features

### 3.1 Authentication
* JWT-based login and registration
* Secure password hashing using bcrypt
* Google OAuth integration
* Protected routes for authenticated users

### 3.2 Document Management
* Upload standard PDF files
* Dashboard to list and filter user-owned and shared documents
* View document details and current status
* Secure local storage of original and signed files

### 3.3 Signature System
* Interactive frontend drag-and-drop signature and text placement functionality
* Ability to sign a document multiple times
* Server-side PDF editing and embedding of signature coordinates (x, y, page)
* Generation and storage of the final signed PDF

### 3.4 Status Lifecycle
* **Pending**: Document is uploaded/shared but not yet finalized
* **Signed**: Document has been successfully signed
* **Rejected**: Document has been rejected by the owner or a shared user
* Reject with reason and timestamp tracking

### 3.5 Public Signing
* Generate secure, time-limited tokenized signing links
* Email sharing invitations via Nodemailer
* External signer workflow (allows public signers or forces them through a branded login/register flow before signing)

### 3.6 Audit Trail
* Logs the identity of users interacting with the document
* Records exact timestamps for all major events (Created, Shared, Signed, Rejected, Reset)
* IP address tracking for external/guest interactions

---

## 4️⃣ Tech Stack

### 4.1 Frontend
* **React (JavaScript)**: UI library
* **Tailwind CSS**: Utility-first styling
* **react-pdf**: PDF rendering in the browser
* **@dnd-kit/core**: Drag-and-drop functionality for signature placement
* **Axios**: HTTP client for API requests
* **Vite**: Frontend build tool

### 4.2 Backend
* **Node.js**: JavaScript runtime environment
* **Express.js**: Web framework for building REST APIs
* **MongoDB**: NoSQL database
* **Mongoose**: Object Data Modeling (ODM) library

### 4.3 Authentication
* **JSON Web Tokens (JWT)**: Secure session management
* **bcryptjs**: Password hashing
* **@react-oauth/google** & **google-auth-library**: Google SSO authentication

### 4.4 PDF Processing
* **pdf-lib**: Powerful backend library for manipulating and drawing text/images onto PDFs

### 4.5 Deployment (Target)
* **Frontend**: Vercel / Netlify
* **Backend**: Render / Railway
* **Database**: MongoDB Atlas

---

## 5️⃣ System Architecture

### 5.1 High-Level Architecture
The system follows a standard Client-Server architecture:
1. **Client → API → Database**: The React frontend communicates with the Express backend via RESTful APIs. The backend validates requests, processes business logic, and interacts with MongoDB.
2. **File Upload Flow**: Users upload PDFs via FormData. Express stores the file on disk (or cloud) using Multer, and saves metadata in MongoDB.
3. **Signature Rendering Flow**: The frontend determines the exact (x, y, page) coordinates of the signature. These coordinates, along with the base64 signature image/text, are sent to the backend. The backend uses `pdf-lib` to load the original PDF, embed the visual signature at the precise location, and save a new `signed-<filename>.pdf` file.

### 5.2 Folder Structure
```text
document-signature-app/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Route logic (auth, docs, audit)
│   │   ├── middleware/       # JWT auth, Multer upload, Audit logging
│   │   ├── models/           # Mongoose schemas (User, Document, AuditLog)
│   │   ├── routes/           # API terminal routes
│   │   └── server.js         # Entry point
│   ├── uploads/              # Stored original and signed PDFs
│   └── .env                  # Backend environment variables
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components (Navbar, ProtectedRoutes)
│   │   ├── pages/            # Page layouts (Login, Dashboard, SignatureEditor)
│   │   ├── App.jsx           # Main React Router setup
│   │   └── main.jsx          # React entry point
│   ├── public/               # Static assets (favicons)
│   └── vite.config.js
└── README.md
```

---

## 6️⃣ Database Schema

### 6.1 User Model
* `_id`: ObjectId
* `name`: String (required)
* `email`: String (required, unique)
* `password`: String (hashed)
* `googleId`: String (optional)
* `createdAt` / `updatedAt`: Timestamps

### 6.2 Document Model
* `_id`: ObjectId
* `fileName`: String
* `filePath`: String (Original uploaded file)
* `signedPath`: String (Final signed file)
* `ownerId`: ObjectId (Ref: User)
* `status`: String (Pending | Signed | Rejected)
* `sharedWith`: Array of Objects `[{ email, permission }]`
* `signatureConfig`: Array or Object (Stores placed signature metadata)
* `createdAt` / `updatedAt`: Timestamps

### 6.3 Audit Model
*(Named AuditLog in our schema)*
* `_id`: ObjectId
* `action`: String (e.g., Created, Shared, Signed, Rejected)
* `documentId`: ObjectId (Ref: Document)
* `userId`: ObjectId (Ref: User, optional for public signs)
* `details`: String (Contextual notes)
* `ipAddress`: String
* `createdAt`: Timestamp

---

## 7️⃣ API Endpoints

### 7.1 Auth APIs
* `POST /api/auth/register`: Register a new user
* `POST /api/auth/login`: Authenticate an existing user
* `POST /api/auth/google`: Authenticate via Google OAuth

### 7.2 Document APIs
* `POST /api/docs/upload`: Upload a new PDF (Multer `multipart/form-data`)
* `GET /api/docs`: Get list of user's uploaded documents
* `GET /api/docs/shared`: Get list of documents shared with the user
* `GET /api/docs/:id`: Get specific document details
* `DELETE /api/docs/:id`: Delete a document and its files

### 7.3 Signature & Sharing APIs
* `POST /api/docs/:id/sign`: Embed signatures into the Document PDF
* `DELETE /api/docs/:id/signatures`: Reset document to remove all signatures
* `POST /api/docs/:id/share`: Send email invite and append permissions
* `PUT /api/docs/:id/reject`: Mark document as rejected

### 7.4 Public API
* `GET /api/docs/public/:token`: Retrieve doc data via secure share token
* `POST /api/docs/public/:token/sign`: Guest signing of requested doc

### 7.5 Audit APIs
* `GET /api/docs/:id/audit`: Retrieve full chronological audit trail for a doc

---

## 8️⃣ Installation & Setup

### 8.1 Clone Repository
```bash
git clone <repo-url>
cd document-signature-app
```

### 8.2 Backend Setup
```bash
cd backend
npm install
npm run dev
```

### 8.3 Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 8.4 Environment Variables
Create a `.env` file in the `backend/` directory:
```env
# Server
PORT=5000

# Database
MONGO_URI=mongodb://localhost:27017/docsignapp

# Security
JWT_SECRET=your_super_secret_jwt_key

# Email Sharing (Nodemailer config)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Authentication
GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

---

## 9️⃣ How the Signature Flow Works

1. **User Uploads PDF**: User selects a PDF on the dashboard. The file is sent via form-data to the backend, saved to disk, and a `Document` record is created in MongoDB.
2. **Audit & Metadata**: An `AuditLog` entry is immediately created noting the upload timestamp and user.
3. **Placing Annotations**: Users open the `SignatureEditor`, dragging text notes or drawn signatures from the sidebar onto the `react-pdf` rendered pages.
4. **Coordinates Saved**: The React app tracks the absolute `x`, `y`, and `pageNumber` for every placed item.
5. **Backend Processing**: Upon clicking "Save", the frontend sends an array of elements. The backend opens the original PDF file using `pdf-lib`.
6. **Embedding Data**: `pdf-lib` iterates over the pages, embedding base64 image data or drawing text at the translated PDF coordinates.
7. **Status Update**: The backend saves a new `signed-<filename>.pdf`, updates the MongoDB record `status` to "Signed", and assigns the new physical file path.
8. **Finalizing**: A final `AuditLog` entry marks the signature event, and the user can now download the secured record.

---

## 🔟 Security Considerations

* **JWT Token Validation**: API routes are strictly protected by a middleware that verifies Bearer tokens, rejecting unauthorized access.
* **Role-based Ownership**: Documents check against `req.user._id` to ensure only the owner can delete, share, or reset signatures. Shared users are strictly limited to `view` or `edit` permissions.
* **Immutable Original PDFs**: The application always uses the originally uploaded PDF as the base template when signing, preventing infinite layer stacking or tampering with the core document text.
* **IP Logging**: Actions triggered via public tokens record the requester's IP securely in the Audit Trail for non-repudiation.
* **Sanitized Payloads**: Max request limits are defined (`express.json({ limit: '50mb' })`) strictly to allow large base64 signatures while preventing unbounded memory attacks.

---

## 1️⃣1️⃣ Deployment Guide

1. **MongoDB Atlas Setup**: Create a free-tier cluster on MongoDB Atlas. Get the connection string and replace `MONGO_URI` in production.
2. **Backend Hosting (Render/Railway)**: 
   * Push your backend folder to GitHub.
   * Connect to Render as a "Web Service".
   * Set the Build Command to `npm install` and Start Command to `node src/server.js`.
   * Add all `.env` variables in the dashboard.
3. **Frontend Hosting (Vercel/Netlify)**:
   * Push the frontend folder to GitHub.
   * Connect to Vercel. 
   * Ensure the framework is set to Vite. Vercel automatically detects `npm run build`.
   * Configure proxy rules or change `axios.defaults.baseURL` to point to the live Render backend URL.

---

## 1️⃣3️⃣ Future Improvements

* **Multi-signer Workflow**: Advanced sequential signing workflows (e.g., Person A must sign, then Person B).
* **Document Encryption**: Encrypting PDF buffers at rest using AES-256 before writing to storage.
* **Cloud Storage**: Replacing local disk storage with AWS S3 buckets for highly scalable asset management.
* **Digital Certificate Signing**: Applying an actual cryptographic PAdES digital certificate to the PDF upon finalization to lock it from future tampering natively in Adobe Acrobat.
* **Custom Signature Drawing**: Integrating a canvas drawing pad on the frontend to allow users to smoothly hand-draw signatures using mouse/touch.

---

## 1️⃣4️⃣ License

**MIT License** - Free to use, modify, and distribute for educational or commercial purposes.

---

## 1️⃣5️⃣ Author

**ANSARI MOHAMMED**  
[GitHub Profile](https://github.com/yourusername)  
Contact: your.email@example.com
