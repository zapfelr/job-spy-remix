# Product Requirements Document: Job Spy (Remix)

## Overview
Job Spy is a web application that provides a centralized feed of job changes across major companies, allowing job seekers to track changes to jobs at companies they're interested in and stay informed about new opportunities, removed listings, or modified positions. The goal is to take control back from LinkedIn.

## Problem Statement
Job seekers currently face an inefficient process when monitoring companies for opportunities:
- Manual checking of multiple company job pages is time-consuming
- No reliable way to detect when new positions are added
- Difficult to track when positions are removed or modified
- No centralized source of truth for job changes

## Target User
- Active job seekers who know the companies where they want to work 
- Job seekers who prefer a proactive approach to job hunting
- Target user is NOT recruiters, for now. Focused on supply side and ensuring candidates have full transparency.

## MVP Features

### 1. User Authentication

- Email/password registration and login using Supabase
- Simple user profile with basic information: preferred job departments and location
-Users can delete their accounts and all associated data for GDPR/CCPA

### 2. Job data and change detection

We'll start with a few main vendors: Ashby and Greenhouse.
Ashby has a public URL to get jobs from job boards -- here's an example: curl https://api.ashbyhq.com/posting-api/job-board/{JOB_BOARD_NAME}?includeCompensation=true
Greenhouse has a public URL to get jobs from job boards -- here's an example: https://boards-api.greenhouse.io/v1/boards/{company_name}/jobs

- We pull data from these APIs hourly
- The MVP will have approximately 500 companies to start.
- We detect changes for:
  - New job listings (additions)
  - Removed job listings (removals)
    - If a job is removed from the jobs page, it is marked inactive, but users will see it as "removed" to avoid duplicate postings.
    - If a job with an existing externalId reappears after being marked inactive, it is reactivated by setting status: active. This generates an "added" change card, treating it as a new appearance on the job page. If the title or location differs from the last active version, a "modified" change card is also generated to reflect the update.
  - Modified title -- This should be an exact string comparison for the title
  - Modified location -- This should be an exact string comparison for the location
- This change detection acts as the single source of truth for each company's changes
- Retention for these changes is 90 days
- Should the API fail for any reason, it should be marked as "error" status to admins only
- One retry attempt automatically. After one retry attempt, any in error status will be addressed manually by admin.

### 3. Change Cards 

The UI is centralized around the idea of job change cards. Each time we see a change for a specific company, a change card is created to capture those changes.
- The change card includes:
  - Company name and logo
  - Change type (added, removed, modified)
  - If added or removed: Job title, Job location, whether it was added or removed, Timestamp
  - If modified: Previous job title or job Location, New job title or job Location, Timestamp
  - Total number of jobs available at the company
    - If jobs were removed or added, this should show the previous total number of jobs and the new number of jobs

### 4. Core MVP

These change cards are organized into several feeds. Users should be able to toggle between the market and tracked companies feeds.
- **Market Feed**:
  - This feed is intended to show "the job market", all change cards for all companies and all job departments
  - Available to all users, even those who haven't subscribed to any companies yet
  - Shows by most recent changes
  - Similar to a "Discover" or "For You" tab on social platforms
  - Serves as a discovery mechanism for users to find new companies to follow
- **Tracked Companies Feed**:
  - This feed is intended to allow a user to "track" changes for specific companies they have chosen to track
  - This feed shows only the companies that the current user has explicitly tracked.
  - Provides quick access to the companies the user cares about most
  - Similar to a "Following" feed on social platforms
  - Empty state if no companies have been tracked
  - When a company is first tracked by the user, a change card should show in this feed stating "Started tracking [company name]"
  - When a company is untracked by the user, a change card should show in this feed stating "Stopped tracking [company name]"
- **Tracked Jobs Feed**:
  - This feed is intended to allow a user to view all jobs they have "tracked", across all companies.
  - This feed shows only the change cards impacting jobs that the current user has explicitly tracked.
  - Provides quick access to the jobs the user cares about most
  - Shows by most recent changes
  - Empty state if no jobs have been tracked
  - When a job is first tracked by the user, a change card should show in this feed stating "Started tracking [job title] at [company name]". This card persists in the feed, in chronological order.
  - When a job is untracked by the user, a change card should show in this feed stating "Stopped tracking [job title] at [company name]". This card persists in the feed, in chronological order.
  - If a tracked job is removed/marked inactive by a company, a change card should show in this feed stating "[job title] at [company name] has been removed." It remains in the user's tracked jobs list, but no further change cards will be shown for that job, until/unless a future pull finds this job is active again. This card persists in the feed, in chronological order.
- **Feed Filters**;
  - The market feed and tracked companies feed both have filters that allow a user to filter the change cards visible by department and location
  - Department filter:
    - Department filter should be a multi-select dropdown of common departments at companies. This is a predefined list of departments.
    - When data is pulled, the departments should be categorized using this central list of departments across all companies. This should be inferred by the system, and can start with a simple keyword-based mapping rule. For example, if I select "Design" as a department, I should see all change cards for "Product Design" or "UX" jobs. If I select "Engineering" as a department, I should see change cards for titles like "forward-deployed engineers" and "senior software engineer". Make this mapping easy to change/update.
  - Location filter:
    - Location filter should be the simplest possible way to filter for location, using a library or plugin where possible. Filters should be by city (e.g. New York, NY; San Francisco, CA) or by state ("New York"; "California"). Exact string matching on location fields from pulled data is fine for MVP.
- **Company List**:
  - When viewing the market feed or tracked companies feed, the user should see a list of companies in the sidebar. This includes their name, logo, and when they were last updated.
  - This is the primary location for a user to "track" companies. Each company in the list has a button for users to track/untrack 
  - This list is sorted alphabetically. V2 will include search functionality.
- **Company Detail Pages**;
  - Each company name is clickable and links to a company detail page
  - The company detail page also has a button to track/untrack the company
  - This page contains two views:
  -- the company feed, which contains all change cards for that company. These are listed in reverse chronological order, and show all change cards for that company without any filtering.
  -- the company's current jobs list, which contains the most up-to-date list of all jobs open/active at that company
    - next to each job on this list, there should be a way to "track" that specific job listing. this will have it show up in the tracked jobs feed.
    - if a job has had no changes or updates in the past 60 days, it should be marked in the UI as "likely stale"
- **User Profile View**:
  - The user profile view will show a list of companies the user is tracking
  - The user profile view will show a list of jobs the user is tracking
  - The user profile will allow the user to set their preferred job department and location filters, so they don't have to reset it every time.
- **Add Company Modal**:
  - If a user doesn't see the company they're looking for in the company sidebar list, they should see an option to add a company
  - For MVP, this will simply pop a modal to enter a URL, which when submitted, will send an email request containing the new company's jobs page URL to the job spy admin team. No validation required on this URL. Email should be sent to jobspyad@gmail.com.


Main Layout:
+----------------+------------------------------------------+
|                |                                          |
| Companies      |           Changes Feed                   |
| Sidebar        |                                          |
|                |  [Change Card]                          |
| + Add Company  |    Company: Acme Corp                   |
|                |    Time: 2h ago                         |
| • Acme Corp    |    Change: Added "Senior Engineer"      |
| • Beta Inc     |                                         |
| • Gamma LLC    |  [Change Card]                          |
|                |    Company: Beta Inc                    |
|                |    Time: 3h ago                         |
|                |    Change: Removed "Product Manager"    |
|                |                                         |
+----------------+-----------------------------------------+

Company Page (when clicking a company name)
+----------------+------------------------------------------+
|                |  Company: Acme Corp                     |
| Companies      |  URL: https://...                       |
| Sidebar        |                                         |
|                |                                         |
| + Add Company  |  Changes History                        |
|                |  [Change Cards specific to Acme Corp]   |
| • Acme Corp    |                                         |
| • Beta Inc     |                                         |
| • Gamma LLC    |                                         |
|                |                                         |
+----------------+-----------------------------------------+

### 6. System Administration- 
- An admin dashboard allows admin to add new companies
- On this admin dashboard, the admin should be able to input a URL, which triggers a manual pull of that company's job page. 
- There should be a review step/staging where the results of the new addition is reviewed and approved before adding into the db. 
- Once a company's URL has been added and approved, it should be included into the scheduled pull moving forward.
- Any errors in the scraping process should be clearly visible to the admin. Errors in scraping are manually reviewed
- The admin dashboard should also show a list of all companies in the database

### Technology Stack (MVP)
- Next.js, React
- Database: Supabase
- Authentication: Supabase
- Hosting: Cloudflare Pages
- Scheduling: Cloudflare Workers
- Rate-limiting to prevent API abuse

### Data Storage
These schemas are not exhaustively complete.
- Company information (name, URL, logo, when it was last updated, industry/sector)
- User account data
- Jobs (company, title, location, department, externalId (the job id from the source platform, this will be unique per company), url, status (active/inactive), latest change)
  - Note: Job listings themselves are not stored, only their URL and data necessary for change detection
- Even if changes in job descriptions and salaries aren’t tracked now, the system should be designed to accommodate that in the future.
- Even though we don't have paid users now, we will want to have paid vs. free users in the future

## Pre-Launch Tasks
- Set up Cloudflare Worker for twice-daily scraping
- Set up Cloudflare Pages project
- Footer with privacy policy, terms of service, contact us, and copyright
- Basic analytics (posthog)
- Basic logging/monitoring (posthog, Sentry)

## Growth Features (V2)
- SEO metadata: Individual company pages will be indexable for search engines
- Set alerts for specific job departments/companies

## Other V2 Features (V2 Roadmap)
- Company industry/sector filters
- Search in company sidebar list
- Enable "hide" company
- Notification system (email, in-app)
- Job description change detection
- Salary/compensation change detection
- Admin override for incorrect job listing changes
- Save job postings & set alerts for specific job titles
- OAuth login (Google, LinkedIn)

## Feature Backlog
- Data export functionality
- Sharing
- Browser extension for one-click URL adding
- Mobile application
- Advanced analytics on hiring trends
- LinkedIn company page monitoring for employee changes
- Filters by job level (Entry, Mid, Senior, Executive)
- "Only Remote Jobs" filter
- Show average posting lifespan per company
- Display hiring trends (job removals vs. additions)

## Success Metrics
- User retention (% of users active at 1 day/3 day/7 day/30 day)
- Number of companies tracked per user
- Also track # of user logins, company and job tracks, and feed views in Posthog

