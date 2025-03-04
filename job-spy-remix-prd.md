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

## MVP Features

### 1. User Authentication

- Email/password registration and login using Supabase
- Simple user profile with basic information: preferred job titles/departments and location
-Users can delete their accounts and all associated data

### 2. Change detection and scraping

- We centralize scraping of job pages twice daily for all companies on our site
- We primarily scrape using simplescraper.io
  - We also scrape using puppeteer/playwright for any sites that simplescraper.io cannot handle
- We detect changes for:
  - New job listings (additions)
  - Removed job listings (removals)
  - Modified job information (changes to title, location)
- For now, we focus on main job listing page data -- we don't dig into the individual job description details.
- This change detection acts as the single source of truth for each company's changes
-- Retention for these changes is 60 days
- URLs that fail to scrape or become inaccessible will be marked as "error" status
- No retry attempts - for now
- If a job is removed from the jobs page, it is marked inactive, but users will see it as "removed" to avoid duplicate postings if the job resurfaces

### 3. Change Cards 

The UI is centralized around the idea of job change cards. Each time one of our scrapes results in changes for a specific company, a change card is created to capture those changes.
- The change card includes:
  - Company name and logo
  - Change type (added, removed, modified)
  - If added or removed: Job title, Job location, Job description, Timestamp
  - If modified: Previous job title or job Location, New job title or job Location, Timestamp
  - Total number of jobs available at the company

### 4. Feeds

These change cards are organized into several feeds. Users should be able to toggle between the market and tracked companies feeds.
- **Market Feed**:
  - This feed is intended to show "the job market", all change cards for all companies and all jobs titles/departments
  - Available to all users, even those who haven't subscribed to any companies yet
  - Shows by most recent changes
  - Similar to a "Discover" or "For You" tab on social platforms
  - Serves as a discovery mechanism for users to find new companies to follow
- **Tracked Companies Feed**:
  - This feed is intended to allow a user to "track" certain companies they're interested in. 
  - This feed shows only the companies that the current user has explicitly tracked.
  - Provides quick access to the companies the user cares about most
  - Similar to a "Following" feed on social platforms
- **Tracked Jobs Feed**:
  - This feed is intended to allow a user to "track" or "star" certain jobs closely
  - This feed shows only the jobs that the current user has explicitly tracked.
  - Provides quick access to the jobs the user cares about most
  - Should we allow users to save job postings 
- **Feed Filters**;
  - The market feed and tracked companies feed both have filters that allow a user to filter the changes they see by job title/department.
  - Job title may need to be a fuzzy match: for example, change cards related to a "Software Engineer" job should show up if the user is filtering on "Senior Software Engineer" or "Engineer"
  - Department should be a multi-select dropdown of common departments at companies. This may also need to be fuzzy matched: for example, if I select "Design" as a department, I should see all change cards for "Product Design" or "UX" jobs
- **Company Detail Pages**;
  - Each company name is clickable and links to a company detail page
  - The company detail page also has a button to track/untrack the company
  - This page contains two views:
  -- the company feed, which contains all change cards for that company. These are listed in reverse chronological order, and show all change cards for that company without any filtering.
  -- the company's current jobs list, which contains the most up-to-date list of all jobs open/active at that company
  - on the current jobs list on this page, next to each job listing, there should be a way to "track" that specific job listing. this will have it show up in the tracked jobs feed.

  ### 5. Other Core UI Features
- **Company List**:
  - When viewing the market feed or tracked companies feed, the user should see a list of companies in the sidebar
  - Each company has a button for users to track/untrack 
  - Filter by industry/sector
  - Sorted alphabetically
- **Add Company Modal**:
  - If a user doesn't see the company they're looking for in the list, they should see an option to add a company
  - For MVP, this will simply send an email request containing the new company's jobs page URL
- **User Profile View**:
  - The user profile view will show a list of companies the user is tracking
  - The user profile view will show a list of jobs the user is tracking
  - The user profile will allow the user to set their preferred job titles/department filter, so they don't have to reset it every time.

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

### Things to keep in mind for architecture decisions:

- Even if job descriptions aren’t scraped now, the system be designed to accommodate that in the future
- Even though we don't have paid users now, we will want to have paid vs. free users in the future

### 6. System Administration- 
- An admin dashboard allows admin to add new companies
- On this admin dashboard, the admin should be able to input a URL, which triggers a manual scrape of that company's job page, and adds the company to the database
- Any errors in the scraping process should be clearly visible to the admin. Errors in scraping are manually reviewed
- The admin dashboard should also show a list of all companies in the database, and allow the admin to delete a company from the database

### Technology Stack (MVP)
- Next.js, React
- Database: Supabase
- Authentication: Supabase
- Hosting: Cloudflare Pages
- Scheduling: Cloudflare Workers
- Rate-limiting to prevent API abuse (if necessary)

### Data Storage
- Company information (name, URL, logo, when it was last scraped, industry/sector)
- User account data
- Jobs (company, title, location, department, externalId (the job id from the source platform), url, status (active/inactive), latest change)
  - Note: Job listings themselves are not stored, only their URL and data necessary for change detection

## Pre-Launch Tasks
- Set up Cloudflare Worker for twice-daily scraping
- Set up Cloudflare Pages project
- Footer with privacy policy, terms of service, contact us, and copyright
- Basic analytics (posthog)
- Basic logging/monitoring (posthog, Sentry)

## Growth Features (V2)
- SEO metadata: Individual company pages will be indexable for search engines
- Set alerts for specific job titles/departments/companies

## Other V2 Features (V2 Roadmap)
- Location filters
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


