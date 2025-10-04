# LexiQ Enterprise Implementation Plan
## Finalized Technical Roadmap

---

## 🎯 Current State Assessment

### ✅ Production-Ready Components
- **React GUI**: Fully functional with EnhancedMainInterface, tabs (Edit, Statistics, Data Management)
- **Live Analysis**: Real-time editing with term validation and context extraction
- **Session Management**: useEditedTerms hook with sessionStorage persistence
- **QA Chat**: AI-powered Q&A panel integrated
- **Export Functionality**: JSON, CSV, TXT export capabilities
- **Python Engine**: Comprehensive 1667-line engine with grammar analysis, semantic typing, multi-language support

### 🔴 Missing Enterprise Components
- User authentication & authorization
- Project persistence (database)
- File upload/storage infrastructure
- Multi-user organization management
- API rate limiting & usage tracking
- Production-grade error handling & monitoring

---

## 📐 Architecture Distribution

### Python Backend (Supabase Edge Functions)
```
├── analyze-translation (existing - enhance)
├── process-files (existing - enhance)
├── generate-report (existing - enhance)
├── qa-chat (existing - enhance)
└── NEW FUNCTIONS:
    ├── batch-analysis (for multiple files)
    ├── glossary-sync (for shared glossaries)
    └── usage-tracking (for analytics)
```

### React Frontend (Current Lovable Project)
```
src/
├── components/lexiq/
│   ├── EnhancedMainInterface.tsx ✅ (preserve JSON functionality)
│   ├── DataManagementTab.tsx ✅
│   ├── EnhancedLiveAnalysisPanel.tsx ✅
│   ├── QAChatPanel.tsx ✅
│   └── NEW:
│       ├── ProjectManagement.tsx
│       ├── AuthGuard.tsx
│       └── OrganizationSettings.tsx
└── hooks/
    ├── useEditedTerms.tsx ✅
    ├── useAnalysisEngine.tsx ✅
    └── NEW:
        ├── useAuth.tsx
        ├── useProjects.tsx
        └── useFileUpload.tsx
```

### Supabase Database Schema
```sql
-- From Enterprise_Database_New.sql
users
organizations
user_roles (CRITICAL: separate table for security)
projects
analysis_sessions
glossaries
file_uploads
usage_logs
```

---

## 🚀 Phase 1: Core Infrastructure (Week 1-2)

### 1A. Database Schema Migration (Days 1-2)

**CRITICAL SECURITY**: Implement user roles in separate table to prevent privilege escalation.

```sql
-- Step 1: Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'viewer');

-- Step 2: Organizations
CREATE TABLE public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) DEFAULT 'starter',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: User profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: User roles (SEPARATE TABLE - SECURITY CRITICAL)
CREATE TABLE public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE(user_id, organization_id, role)
);

-- Step 5: Projects
CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'en',
    domain VARCHAR(50) DEFAULT 'general',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: File uploads
CREATE TABLE public.file_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('translation', 'glossary')),
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 7: Analysis sessions
CREATE TABLE public.analysis_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    translation_file_id UUID REFERENCES file_uploads(id) ON DELETE SET NULL,
    glossary_file_id UUID REFERENCES file_uploads(id) ON DELETE SET NULL,
    language VARCHAR(10) NOT NULL,
    domain VARCHAR(50) NOT NULL,
    analyzed_terms JSONB NOT NULL DEFAULT '[]',
    statistics JSONB DEFAULT '{}',
    processing_time FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 8: Glossaries
CREATE TABLE public.glossaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    terms JSONB NOT NULL DEFAULT '[]',
    is_shared BOOLEAN DEFAULT false,
    language VARCHAR(10) NOT NULL,
    domain VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 9: Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Step 10: Trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

### 1B. Row Level Security Policies (Days 2-3)

```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glossaries ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects"
    ON public.projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
    ON public.projects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
    ON public.projects FOR DELETE
    USING (auth.uid() = user_id);

-- Analysis sessions policies
CREATE POLICY "Users can view own analysis sessions"
    ON public.analysis_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analysis sessions"
    ON public.analysis_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- File uploads policies
CREATE POLICY "Users can view own files"
    ON public.file_uploads FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can upload files"
    ON public.file_uploads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Glossaries policies (with sharing)
CREATE POLICY "Users can view own or shared glossaries"
    ON public.glossaries FOR SELECT
    USING (
        auth.uid() = user_id OR
        (is_shared = true AND organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        ))
    );

CREATE POLICY "Users can create glossaries"
    ON public.glossaries FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

### 1C. Storage Buckets (Day 3)

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('translation-files', 'translation-files', false),
    ('glossary-files', 'glossary-files', false);

-- Storage policies
CREATE POLICY "Users can upload translation files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'translation-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own translation files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'translation-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can upload glossary files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'glossary-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own glossary files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'glossary-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );
```

### 1D. Authentication Implementation (Days 4-5)

**New Files to Create:**
- `src/pages/Auth.tsx` - Login/signup page
- `src/hooks/useAuth.tsx` - Authentication hook
- `src/components/lexiq/AuthGuard.tsx` - Protected route wrapper
- `src/hooks/useProjects.tsx` - Project management hook

**Key Features:**
- Email/password authentication
- Auto-confirm email (for testing)
- Session persistence with both user AND session state
- Proper emailRedirectTo configuration
- Protected routes for main interface

### 1E. File Upload System (Days 5-7)

**Enhance Existing Files:**
- `src/hooks/useFileProcessor.tsx` - Add storage upload
- `src/components/lexiq/EnhancedMainInterface.tsx` - Integrate file persistence

**New Edge Function:**
- `supabase/functions/upload-file/index.ts` - Handle file uploads to storage

---

## 🚀 Phase 2: Project Management (Week 3)

### 2A. Project CRUD Operations
- Create new projects
- Load saved projects
- Switch between projects
- Archive/delete projects

### 2B. Analysis Session Persistence
- Save analysis results to database
- Load previous analysis sessions
- Version history for edited terms
- Auto-save functionality

### 2C. Enhanced File Management
- List uploaded files per project
- Re-use previous translations/glossaries
- File version management

---

## 🚀 Phase 3: Collaboration Features (Week 4-5)

### 3A. Organization Management
- Create/join organizations
- Invite team members
- Shared glossaries
- Team analytics

### 3B. Shared Glossaries
- Organization-wide glossaries
- Import/export shared terms
- Glossary templates per domain

### 3C. Role-Based Access Control
- Admin: Full access
- Member: Create projects, use shared glossaries
- Viewer: Read-only access

---

## 🚀 Phase 4: Production Optimization (Week 6)

### 4A. Performance
- Edge function optimization
- Database indexing
- Query optimization
- Caching strategy (Redis if needed)

### 4B. Monitoring & Analytics
- Error tracking
- Usage analytics
- Performance metrics
- Cost tracking

### 4C. Security Hardening
- Rate limiting on edge functions
- Input validation
- SQL injection prevention (via Supabase client only)
- CORS configuration

---

## 🎯 Critical Preservation Rules

### DO NOT MODIFY (Keep JSON Functionality):
1. `src/components/lexiq/EnhancedMainInterface.tsx` - JSON term structure
2. `src/hooks/useEditedTerms.tsx` - Term deduplication logic
3. `src/components/lexiq/DataManagementTab.tsx` - Live spreadsheet
4. `src/utils/analysisDataTransformer.ts` - Data transformation
5. All existing edge functions' core logic

### SAFE TO ENHANCE:
1. Add database persistence alongside sessionStorage
2. Wrap existing components with auth guards
3. Add project context provider
4. Enhance file upload with storage
5. Add user/organization metadata

---

## 📊 Success Metrics

### Week 2 MVP Goals:
- ✅ Users can sign up/login
- ✅ Users can create projects
- ✅ Files persist in storage
- ✅ Analysis results save to database
- ✅ Existing UI works unchanged

### Week 4 Enterprise Goals:
- ✅ Organizations functional
- ✅ Shared glossaries work
- ✅ Team collaboration enabled
- ✅ Role-based permissions

### Week 6 Production Goals:
- ✅ 99.9% uptime
- ✅ < 2s analysis response time
- ✅ Full error monitoring
- ✅ Comprehensive documentation

---

## 🔧 Next Immediate Steps

1. **Run database migration** (create all tables)
2. **Configure Supabase Auth** (enable auto-confirm email)
3. **Create auth page** (login/signup UI)
4. **Add auth hooks** (useAuth.tsx)
5. **Protect main interface** (AuthGuard wrapper)
6. **Test authentication flow** (signup → login → main window)

Ready to proceed with Phase 1A (database migration)?
