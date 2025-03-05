export type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  job_board_url: string;
  job_board_type: 'ashby' | 'greenhouse';
  board_identifier: string;
  industry: string | null;
  last_updated: string | null;
  total_jobs_count: number;
  previous_jobs_count: number;
  created_at: string;
  status: 'active' | 'inactive';
};

export type Industry = {
  id: string;
  name: string;
  created_at: string;
};

export type Department = {
  id: string;
  name: string;
  keywords: string[];
  created_at: string;
};

export type Job = {
  id: string;
  company_id: string;
  external_id: string;
  title: string;
  description: string | null;
  location: string | null;
  department_id: string | null;
  department_raw: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_interval: 'yearly' | 'monthly' | 'hourly' | null;
  url: string;
  status: 'active' | 'inactive' | 'stale';
  last_change: string | null;
  last_seen_active: string;
  created_at: string;
};

export type JobChange = {
  id: string;
  job_id: string | null;
  company_id: string;
  change_type: 'added' | 'removed' | 'modified' | 'tracking_started' | 'tracking_stopped' | 'marked_stale';
  previous_title: string | null;
  new_title: string | null;
  previous_location: string | null;
  new_location: string | null;
  previous_description: string | null;
  new_description: string | null;
  previous_salary_min: number | null;
  new_salary_min: number | null;
  previous_salary_max: number | null;
  new_salary_max: number | null;
  previous_salary_currency: string | null;
  new_salary_currency: string | null;
  previous_salary_interval: string | null;
  new_salary_interval: string | null;
  previous_jobs_count: number | null;
  new_jobs_count: number | null;
  created_at: string;
};

export type UserProfile = {
  id: string;
  preferred_departments: string[] | null;
  preferred_location: string | null;
  last_login: string | null;
  login_count: number;
  created_at: string;
  deleted_at: string | null;
};

export type UserCompanyTracking = {
  id: string;
  user_id: string;
  company_id: string;
  created_at: string;
};

export type UserJobTracking = {
  id: string;
  user_id: string;
  job_id: string;
  created_at: string;
};

export type UserActivity = {
  id: string;
  user_id: string;
  activity_type: string;
  feed_type: 'market' | 'tracked_companies' | 'tracked_jobs' | null;
  created_at: string;
};

export type EmailQueue = {
  id: string;
  to_email: string;
  subject: string;
  body: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
  sent_at: string | null;
};

export type Database = {
  companies: Company[];
  industries: Industry[];
  departments: Department[];
  jobs: Job[];
  job_changes: JobChange[];
  user_profiles: UserProfile[];
  user_company_tracking: UserCompanyTracking[];
  user_job_tracking: UserJobTracking[];
  user_activity: UserActivity[];
  email_queue: EmailQueue[];
}; 