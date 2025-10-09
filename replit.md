# JurisThis - AI Legal Assistant for Indian Law

## Overview

JurisThis is a ChatGPT-style web application designed specifically for Indian legal professionals, including lawyers, students, and law firms. The platform provides intelligent case law search, judgment analysis, legal drafting, and citation verification capabilities. Built as a full-stack application with a modern React frontend and Express backend, it features case folder workspaces that allow users to organize legal research and drafts in project-specific contexts.

The application emphasizes grounded, verifiable legal outputs with source citations, multi-source cross-checking, and structured analysis of Indian legal documents including case laws, statutes, and the IPC↔BNS conversion system.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and data fetching

**UI Component System**
- Radix UI primitives for accessible, unstyled components
- shadcn/ui component library built on Radix with Tailwind CSS
- Custom theming system using CSS variables for light/dark mode support
- Tailwind CSS for utility-first styling with "new-york" style preset

**State Management Pattern**
- Server state managed via React Query with query invalidation
- Local component state using React hooks
- WebSocket connection for real-time streaming responses
- Authentication state synchronized with backend sessions

**Key Frontend Features**
- Chat interface with streaming AI responses
- Folder-based project workspaces (case folders)
- Legal document draft generator with templates
- Citation verification and source display
- Real-time collaboration via WebSocket

### Backend Architecture

**Server Framework**
- Express.js with TypeScript
- HTTP server with WebSocket support for streaming
- Session-based authentication using Replit Auth (OpenID Connect)
- Middleware for request logging and error handling

**Authentication & Authorization**
- Replit Auth integration via OpenID Client and Passport.js
- Session storage in PostgreSQL using connect-pg-simple
- Protected routes with isAuthenticated middleware
- User profile management with first-party user table

**AI & LLM Integration**
- OpenAI API for chat completions and embeddings
- GPT-5 model for conversational responses (configurable)
- text-embedding-3-large for document vectorization
- Streaming responses via WebSocket for real-time updates

**Service Layer Architecture**
- `chatService`: Manages chat sessions, message history, and AI interactions
- `draftService`: Template-based legal document generation
- `citationService`: Multi-source citation verification with caching
- `ragService`: Retrieval-Augmented Generation for context-aware responses

**RAG Implementation**
- In-memory vector store for MVP (Map-based)
- Document chunking and embedding generation
- Similarity search for context retrieval
- Folder-scoped context when working within case folders

### Data Storage

**Database System**
- PostgreSQL via Neon serverless driver
- Drizzle ORM for type-safe database queries
- Schema-first approach with migrations in `/migrations` directory

**Core Data Models**
- `users`: User profiles (mandatory for Replit Auth)
- `sessions`: Session storage (mandatory for Replit Auth)
- `organizations`: Multi-tenant support with plan tiers
- `folders`: Case/project workspaces with privacy controls
- `chats`: Conversation threads with mode tracking
- `messages`: Chat messages with role, sources, and verification status
- `documents`: Uploaded files with S3 storage references
- `templates`: Legal document templates (10 types for MVP)
- `drafts`: Generated legal documents with HTML content
- `embeddings`: Vector embeddings for RAG
- `citationVerifications`: Cached citation verification results

**File Storage**
- Document uploads handled via Multer middleware
- File storage abstraction in `storage.ts` interface
- Support for S3-compatible object storage
- Extracted text stored in database for RAG indexing

### API Structure

**RESTful Endpoints**
- `/api/auth/*`: Authentication routes (login, logout, user profile)
- `/api/folders`: Folder CRUD operations
- `/api/chats`: Chat management and message history
- `/api/drafts`: Legal document generation and editing
- `/api/documents`: File upload and retrieval
- `/api/templates`: Legal template catalog

**WebSocket Protocol**
- `/ws`: WebSocket endpoint for streaming chat responses
- Message format: `{ type, chatId, content, sources, metadata, isComplete }`
- Automatic reconnection with 3-second timeout
- Support for streaming partial responses

### Legal-Specific Features

**Template System**
- 10 pre-built legal document templates (MVP):
  - Bail Application (Regular/Anticipatory/Interim)
  - Legal Notice (Cheque bounce/breach)
  - Writ Petition (Habeas Corpus/Mandamus)
  - Consumer Complaint
  - Civil Suit/Plaint
  - PIL (Public Interest Litigation)
  - Criminal Complaint
  - Court Affidavit
  - NDA Agreement
  - Employment Contract

**Chat Modes**
- General: Open-ended legal queries
- Case: Judgment analysis and case law research
- Drafting: Document generation assistance
- Statute: Bare act explanations and IPC↔BNS conversion

**Verification System**
- Citation verification with multi-source cross-checking
- Verification status tracking (verified/unverified/pending)
- Source attribution for all legal claims
- Cached results to minimize redundant verification

## External Dependencies

**Core Infrastructure**
- Replit platform for hosting and authentication
- Neon PostgreSQL for serverless database
- OpenAI API for LLM and embeddings

**Authentication**
- Replit Auth (OpenID Connect provider)
- OpenID Client library for OIDC flows
- Passport.js for authentication strategies

**AI & ML Services**
- OpenAI GPT-5 for conversational AI
- OpenAI text-embedding-3-large for vector embeddings

**Development Tools**
- Replit-specific plugins:
  - `@replit/vite-plugin-runtime-error-modal`
  - `@replit/vite-plugin-cartographer`
  - `@replit/vite-plugin-dev-banner`

**Third-Party Libraries**
- WebSocket (ws) for real-time communication
- Drizzle ORM for database operations
- date-fns for date formatting
- nanoid for unique ID generation
- Multer for file uploads

**Planned Integrations** (not yet implemented)
- Legal research databases for citation verification
- Indian court case law APIs
- Document storage (S3-compatible service)