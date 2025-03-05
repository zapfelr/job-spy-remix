# Job Spy Implementation Plan

## Phase 1: Project Setup and Infrastructure

### 1.1 Initial Project Setup
- ✅ Initialize Next.js project with TypeScript, Tailwind CSS
- ✅ Set up ESLint, Prettier, and other development tools
- ✅ Configure Git repository and branching strategy -- https://github.com/zapfelr/job-spy-remix

**Variations from plan:**
- Used Next.js App Router as specified in the plan
- Set up Supabase client utility
- Created environment variable configuration
- Updated README with project information

### 1.2 Database Setup
- ✅ Configure Supabase project - configured with MCP server
- ✅ Create database schemas:
  ```sql
  -- Companies table
  CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    job_board_url TEXT NOT NULL,
    job_board_type TEXT NOT NULL, -- 'ashby' or 'greenhouse'
    board_identifier TEXT NOT NULL, -- JOB_BOARD_NAME or company_name from API
    industry TEXT,
    last_updated TIMESTAMP WITH TIME ZONE,
    total_jobs_count INTEGER DEFAULT 0,
    previous_jobs_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active'
  );

  -- Industries table (new)
  CREATE TABLE industries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name)
  );

  -- Departments table (new)
  CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    keywords TEXT[], -- Array of keywords for matching
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name)
  );

  -- Jobs table
  CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    department_id UUID REFERENCES departments(id),
    department_raw TEXT, -- Original department text from job posting
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency TEXT,
    salary_interval TEXT, -- 'yearly', 'monthly', 'hourly'
    url TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'inactive', 'stale'
    last_change TIMESTAMP WITH TIME ZONE,
    last_seen_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, external_id)
  );

  -- Job Changes table
  CREATE TABLE job_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id),
    company_id UUID REFERENCES companies(id),
    change_type TEXT NOT NULL, -- 'added', 'removed', 'modified', 'tracking_started', 'tracking_stopped', 'marked_stale'
    previous_title TEXT,
    new_title TEXT,
    previous_location TEXT,
    new_location TEXT,
    previous_description TEXT,
    new_description TEXT,
    previous_salary_min INTEGER,
    new_salary_min INTEGER,
    previous_salary_max INTEGER,
    new_salary_max INTEGER,
    previous_salary_currency TEXT,
    new_salary_currency TEXT,
    previous_salary_interval TEXT,
    new_salary_interval TEXT,
    previous_jobs_count INTEGER,
    new_jobs_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Users table (extends Supabase auth.users)
  CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    preferred_departments TEXT[],
    preferred_location TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- For GDPR/CCPA compliance
  );

  -- User Company Tracking
  CREATE TABLE user_company_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES companies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, company_id)
  );

  -- User Job Tracking
  CREATE TABLE user_job_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    job_id UUID REFERENCES jobs(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, job_id)
  );

  -- User Activity Tracking
  CREATE TABLE user_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    activity_type TEXT NOT NULL, -- 'login', 'view_feed', 'track_company', 'track_job', etc.
    feed_type TEXT, -- 'market', 'tracked_companies', 'tracked_jobs'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Email Queue (for Add Company requests)
  CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
  );
  ```

**Variations from plan:**
- Created SQL script for manual execution in Supabase dashboard
- Added TypeScript types for database schema
- Verified database setup with test queries

### 1.3 Department Mapping System Setup
- ✅ Request and initialize the manual department list
- ✅ Create initial department records in the database
- ✅ Implement keyword-based mapping rules (e.g., "Design" matches "Product Design", "UX")
- ✅ Develop programmatic keyword update mechanism (no UI needed)
- ✅ Set up department matching algorithm for job data processing

**Variations from plan:**
- Created a comprehensive department mapping system with extensive keyword lists for each department
- Implemented a caching mechanism for department data to improve performance
- Added a testing framework to verify department matching accuracy
- Created utility functions for programmatically updating department keywords
- Implemented a hierarchical matching algorithm that prioritizes raw department data, then title, then description

### 1.4 Authentication Setup
- ✅ Configure Supabase Auth
- ✅ Set up email/password authentication
- ✅ Create auth context and hooks

**Variations from plan:**
- Used the newer `@supabase/ssr` package instead of the deprecated `@supabase/auth-helpers-nextjs`
- Implemented both client-side and server-side authentication utilities
- Created middleware for session management and token refreshing
- Added a login page with server actions for authentication
- Implemented email confirmation flow
- Set up AuthProvider in the root layout

## Phase 2: Core Data Infrastructure

### 2.1 Job Data Collection System
- ✅ Create Cloudflare Worker for job data collection
- ✅ Implement Ashby API integration:
  - ✅ Use endpoint: https://api.ashbyhq.com/posting-api/job-board/{JOB_BOARD_NAME}
  - ✅ Include compensation data with ?includeCompensation=true
  - ✅ Store board_identifier as JOB_BOARD_NAME
- ✅ Implement Greenhouse API integration:
  - ✅ Use endpoint: https://boards-api.greenhouse.io/v1/boards/{company_name}/jobs
  - ✅ Store board_identifier as company_name
- ✅ Set up twice-daily scheduling (will increase to hourly at launch)
- ✅ Implement retry mechanism (one retry attempt)
- ✅ Add error logging system:
  - ✅ Log API failures and error details
  - ✅ Track error counts by company and API
  - ✅ No user-visible error notifications, admin-only visibility
- ✅ Create test data generator for development:
  - ✅ Generate sample companies with varied attributes
  - ✅ Create job listings with multiple departments and locations
  - ✅ Simulate changes (additions, removals, modifications)
  - ✅ Include reactivation test cases
  - ✅ Provide stale job examples (60+ days without changes)

**Variations from plan:**
- Added a more sophisticated job processor with detailed change detection
- Implemented a comprehensive error logging system with database storage
- Created a more robust test data generator with various job change scenarios
- Added support for manual job collection via HTTP endpoint
- Implemented batch processing to avoid overwhelming APIs
- Added department matching integration for job categorization
- Consolidated job collector code into a single file for better maintainability
- Implemented salary information extraction from Greenhouse job descriptions
- Created a separate TypeScript configuration for workers to improve development experience
- Added more detailed logging throughout the job collection process

**Future enhancements:**
- Consider adding support for additional job board types (Lever, Workday)
- Implement more sophisticated salary extraction for Greenhouse jobs
- Add monitoring and alerting for failed job collections
- Optimize database queries for better performance at scale
- Consider implementing a queue system for processing large numbers of companies

### 2.2 Change Detection System
- Implement job comparison logic
- Create change detection algorithms for:
  - New job listings (additions)
  - Removed job listings:
    - Mark as inactive in database
    - Show as "removed" in UI
    - Retain for duplicate prevention
  - Modified titles (exact string comparison)
  - Modified locations (exact string comparison)
  - Job reactivation logic:
    - Generate a single card for reactivated jobs that captures both the reactivation and any modifications
    - Include previous and new values for modified fields
  - Stale job detection (60+ days without changes)
    - Add simple UI indicator for stale jobs
    - No separate notifications or views needed
- Implement change card generation with all required fields
- Set up 90-day retention policy for changes

### 2.3 Admin Dashboard
- Create admin interface for:
  - Company management
  - Manual job pulls with staging/review step
  - Error monitoring and retry triggers
  - API failure dashboard for specific companies
  - Company approval workflow:
    - Review new company submissions
    - Preview job data before approval
    - Add to scheduled pulls after approval
- Implement email notification system:
  - Configure email service
  - Set up jobspyad@gmail.com notifications
  - Create email templates for company requests

## Phase 3: Frontend Development

### 3.1 Core Layout and Navigation
- Implement main layout with companies sidebar
- Create navigation system
- Set up responsive design system

### 3.2 Feed Implementation
- Create Market Feed:
  - Show all changes chronologically with most recent first
  - Include company job count changes
  - Support department and location filters
  - Available to all users (no auth required)
  - Add empty state design
- Create Tracked Companies Feed:
  - Auth users only
  - Show only tracked company changes
  - Include tracking start/stop events
  - Support filters
  - Add empty state with tracking suggestions
  - Persist all tracking event cards
- Create Tracked Jobs Feed:
  - Auth users only 
  - Show only tracked job changes
  - Include tracking events
  - Show removal notifications
  - Maintain chronological order
  - Persist all tracking status cards
  - Keep removed jobs in tracking list
  - Add empty state with job suggestions
- Implement feed filters:
  - Auth users only
  - Multi-select department filter with keyword matching
  - Location filter (city/state) with exact matching
  - Save user preferences

### 3.3 Company Features
- Implement company list sidebar:
  - Alphabetical sorting
  - Show last updated timestamp
  - Track/untrack functionality
  - Add "Add Company" button in sidebar
- Implement Add Company Modal:
  - Simple URL input field
  - No URL validation required
  - Submit button triggers email to jobspyad@gmail.com
  - Success/error feedback to user
- Create company detail pages:
  - Company feed view (reverse chronological)
  - Current jobs list with tracking
  - Stale job indicators (60+ days)
  - Track/untrack company button
  - Show company URL and details

### 3.4 Change Cards
- Design and implement change card components
- Create different card types for:
  - Added jobs
  - Removed jobs
  - Modified jobs
  - Tracking status changes

### 3.5 User Profile
- Create user profile view
- Implement basic preference settings:
  - Department preferences
  - Location preferences
- Implement GDPR/CCPA compliant account deletion functionality

### 3.6 Footer
- Create privacy policy
- Create terms of service
- Add contact information
- Add copyright notice
- Implement footer component

## Phase 4: Testing and Polish

### 4.1 Testing
- Create comprehensive test scripts for:
  - Job data collection
  - Change detection scenarios
  - API error handling
  - User tracking functionalities
- Unit tests for critical components
- Integration tests for API endpoints
- End-to-end tests for main user flows
- Performance testing

### 4.2 Analytics and Monitoring
- Set up PostHog analytics
- Configure Sentry error tracking
- Will use 3rd party analytics system for detailed metrics in the future
- Set up basic monitoring for critical system functions

### 4.3 Documentation and Polish
- Create technical documentation
- Add loading states
- Implement error boundaries
- Add empty states
- Create privacy policy and terms of service

## Phase 5: Launch Preparation

### 5.1 Pre-launch Tasks
- Set up CI/CD pipeline with Cloudflare Pages
- Increase job data collection frequency to hourly
- Security audit
- Performance optimization
- SEO implementation
- Browser testing
- Load testing

### 5.2 Launch Tasks
- Initial population of approximately 500 companies via admin dashboard
- Monitoring setup
- Backup procedures
- Launch checklist verification

## Key Technical Decisions

### State Management
- Use Next.js App Router and Server Components
- Leverage React Context for global state where needed
- Use Supabase real-time subscriptions for live updates

### API Design
- RESTful endpoints for CRUD operations
- WebSocket connections for real-time updates
- Rate limiting implementation
- Caching strategy

### Security Considerations
- HTTPS enforcement
- CORS configuration
- API key management
- Input validation
- XSS prevention
- CSRF protection

### Performance Optimization
- Image optimization
- Code splitting
- Caching strategy
- Database indexing
- Query optimization

## Potential Challenges and Mitigation

### Challenge 1: API Rate Limits
- Implement queuing system
- Add backoff strategy
- Monitor usage

### Challenge 2: Data Accuracy
- Implement validation checks
- Add manual override capability
- Create error reporting system

### Challenge 3: Scalability
- Design for horizontal scaling
- Implement caching
- Use database indexing
- Monitor performance metrics