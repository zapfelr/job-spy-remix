import { supabase } from '../lib/supabase-script';
import { v4 as uuidv4 } from 'uuid';
import { Company, Job, JobChange } from '../types/database';

/**
 * Generate test data for development
 */
async function generateTestData() {
  console.log('Generating test data...');

  try {
    // 1. Generate sample companies
    const companies = await generateCompanies();
    console.log(`Generated ${companies.length} companies`);

    // 2. Generate jobs for each company
    let totalJobs = 0;
    for (const company of companies) {
      const jobs = await generateJobs(company);
      totalJobs += jobs.length;
      console.log(`Generated ${jobs.length} jobs for ${company.name}`);
    }
    console.log(`Total jobs generated: ${totalJobs}`);

    // 3. Generate job changes
    const totalChanges = await generateJobChanges();
    console.log(`Generated ${totalChanges} job changes`);

    console.log('Test data generation complete!');
  } catch (error) {
    console.error('Error generating test data:', error);
  }
}

/**
 * Generate sample companies
 */
async function generateCompanies(): Promise<Company[]> {
  // Sample company data
  const companyData = [
    {
      name: 'Acme Corp',
      logo_url: 'https://placehold.co/200x200?text=Acme',
      job_board_url: 'https://boards.greenhouse.io/acmecorp',
      job_board_type: 'greenhouse',
      board_identifier: 'acmecorp',
      industry: 'Technology',
      total_jobs_count: 0,
      previous_jobs_count: 0,
      status: 'active'
    },
    {
      name: 'TechStart',
      logo_url: 'https://placehold.co/200x200?text=TechStart',
      job_board_url: 'https://jobs.ashbyhq.com/techstart',
      job_board_type: 'ashby',
      board_identifier: 'techstart',
      industry: 'Technology',
      total_jobs_count: 0,
      previous_jobs_count: 0,
      status: 'active'
    },
    {
      name: 'FinanceHub',
      logo_url: 'https://placehold.co/200x200?text=FinanceHub',
      job_board_url: 'https://boards.greenhouse.io/financehub',
      job_board_type: 'greenhouse',
      board_identifier: 'financehub',
      industry: 'Finance',
      total_jobs_count: 0,
      previous_jobs_count: 0,
      status: 'active'
    },
    {
      name: 'HealthPlus',
      logo_url: 'https://placehold.co/200x200?text=HealthPlus',
      job_board_url: 'https://jobs.ashbyhq.com/healthplus',
      job_board_type: 'ashby',
      board_identifier: 'healthplus',
      industry: 'Healthcare',
      total_jobs_count: 0,
      previous_jobs_count: 0,
      status: 'active'
    },
    {
      name: 'RetailGiant',
      logo_url: 'https://placehold.co/200x200?text=RetailGiant',
      job_board_url: 'https://boards.greenhouse.io/retailgiant',
      job_board_type: 'greenhouse',
      board_identifier: 'retailgiant',
      industry: 'Retail',
      total_jobs_count: 0,
      previous_jobs_count: 0,
      status: 'active'
    }
  ];

  // Insert companies one by one to avoid the ON CONFLICT issue
  const companies: Company[] = [];
  
  for (const company of companyData) {
    // Check if company already exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('name', company.name)
      .single();
    
    if (existingCompany) {
      console.log(`Company ${company.name} already exists, skipping`);
      companies.push(existingCompany as Company);
      continue;
    }
    
    // Insert new company
    const { data: newCompany, error } = await supabase
      .from('companies')
      .insert({
        ...company,
        id: uuidv4(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error(`Error inserting company ${company.name}:`, error);
    } else if (newCompany) {
      console.log(`Created company: ${newCompany.name}`);
      companies.push(newCompany as Company);
    }
  }

  return companies;
}

/**
 * Generate jobs for a company
 */
async function generateJobs(company: Company): Promise<Job[]> {
  // Sample job titles by department
  const jobsByDepartment = {
    'Engineering': [
      'Software Engineer',
      'Frontend Developer',
      'Backend Developer',
      'DevOps Engineer',
      'Data Engineer'
    ],
    'Design': [
      'Product Designer',
      'UX Designer',
      'UI Designer',
      'Graphic Designer',
      'Brand Designer'
    ],
    'Marketing': [
      'Marketing Manager',
      'Content Strategist',
      'SEO Specialist',
      'Social Media Manager',
      'Growth Marketer'
    ],
    'Sales': [
      'Sales Representative',
      'Account Executive',
      'Sales Manager',
      'Business Development Representative',
      'Customer Success Manager'
    ],
    'Finance': [
      'Financial Analyst',
      'Accountant',
      'Controller',
      'Finance Manager',
      'Bookkeeper'
    ],
    'Human Resources': [
      'HR Manager',
      'Recruiter',
      'People Operations Specialist',
      'Talent Acquisition Manager',
      'HR Business Partner'
    ],
    'Operations': [
      'Operations Manager',
      'Project Manager',
      'Business Analyst',
      'Office Manager',
      'Executive Assistant'
    ]
  };

  // Sample locations
  const locations = [
    'San Francisco, CA',
    'New York, NY',
    'Austin, TX',
    'Seattle, WA',
    'Remote',
    'Chicago, IL',
    'Boston, MA',
    'Los Angeles, CA'
  ];

  // Get departments from the database
  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('*');

  if (deptError) {
    console.error('Error fetching departments:', deptError);
    return [];
  }

  // Create jobs
  const jobsToInsert = [];
  let jobCount = Math.floor(Math.random() * 15) + 5; // 5-20 jobs per company

  for (let i = 0; i < jobCount; i++) {
    // Pick a random department
    const departmentKeys = Object.keys(jobsByDepartment);
    const departmentName = departmentKeys[Math.floor(Math.random() * departmentKeys.length)];
    
    // Find matching department in database
    const department = departments.find(d => d.name === departmentName);
    
    // Pick a random job title for this department
    const jobTitles = jobsByDepartment[departmentName as keyof typeof jobsByDepartment];
    const title = jobTitles[Math.floor(Math.random() * jobTitles.length)];
    
    // Pick a random location
    const location = locations[Math.floor(Math.random() * locations.length)];
    
    // Generate salary data (some jobs have salary, some don't)
    const hasSalary = Math.random() > 0.3; // 70% of jobs have salary
    const salaryMin = hasSalary ? Math.floor(Math.random() * 50000) + 50000 : null; // $50k-$100k
    const salaryMax = hasSalary && salaryMin ? salaryMin + Math.floor(Math.random() * 50000) : null; // $50k more than min
    
    jobsToInsert.push({
      id: uuidv4(),
      company_id: company.id,
      external_id: `job-${i}-${Date.now()}`,
      title,
      description: `This is a test job description for ${title} at ${company.name}.`,
      location,
      department_id: department?.id || null,
      department_raw: departmentName,
      salary_min: salaryMin,
      salary_max: salaryMax,
      salary_currency: hasSalary ? 'USD' : null,
      salary_interval: hasSalary ? 'yearly' : null,
      url: `${company.job_board_url}/jobs/${i}`,
      status: 'active',
      last_change: new Date().toISOString(),
      last_seen_active: new Date().toISOString(),
      created_at: new Date().toISOString()
    });
  }

  // Insert jobs
  const { data: jobs, error } = await supabase
    .from('jobs')
    .upsert(jobsToInsert)
    .select();

  if (error) {
    console.error('Error inserting jobs:', error);
    return [];
  }

  // Update company job count
  await supabase
    .from('companies')
    .update({
      total_jobs_count: jobsToInsert.length,
      previous_jobs_count: jobsToInsert.length,
      last_updated: new Date().toISOString()
    })
    .eq('id', company.id);

  return jobs as Job[];
}

/**
 * Generate job changes
 */
async function generateJobChanges(): Promise<number> {
  // Get all jobs
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('*');

  if (jobsError) {
    console.error('Error fetching jobs:', jobsError);
    return 0;
  }

  // Generate different types of changes
  const changes: Partial<JobChange>[] = [];

  // 1. Added jobs (for all jobs)
  for (const job of jobs) {
    changes.push({
      id: uuidv4(),
      job_id: job.id,
      company_id: job.company_id,
      change_type: 'added',
      new_title: job.title,
      new_location: job.location,
      new_description: job.description,
      new_salary_min: job.salary_min,
      new_salary_max: job.salary_max,
      new_salary_currency: job.salary_currency,
      new_salary_interval: job.salary_interval,
      created_at: job.created_at
    });
  }

  // 2. Modified jobs (for some jobs)
  const jobsToModify = jobs.filter(() => Math.random() > 0.7); // 30% of jobs get modified
  
  for (const job of jobsToModify) {
    // Create a modification date after creation
    const modDate = new Date(job.created_at);
    modDate.setDate(modDate.getDate() + Math.floor(Math.random() * 30) + 1); // 1-30 days after creation
    
    changes.push({
      id: uuidv4(),
      job_id: job.id,
      company_id: job.company_id,
      change_type: 'modified',
      previous_title: job.title,
      new_title: `Senior ${job.title}`, // Example modification
      previous_location: job.location,
      new_location: job.location, // No change
      created_at: modDate.toISOString()
    });
    
    // Update the job with the new title
    await supabase
      .from('jobs')
      .update({
        title: `Senior ${job.title}`,
        last_change: modDate.toISOString()
      })
      .eq('id', job.id);
  }

  // 3. Removed jobs (for some jobs)
  const jobsToRemove = jobs.filter(() => Math.random() > 0.8); // 20% of jobs get removed
  
  for (const job of jobsToRemove) {
    // Create a removal date after creation
    const removalDate = new Date(job.created_at);
    removalDate.setDate(removalDate.getDate() + Math.floor(Math.random() * 45) + 15); // 15-60 days after creation
    
    changes.push({
      id: uuidv4(),
      job_id: job.id,
      company_id: job.company_id,
      change_type: 'removed',
      previous_title: job.title,
      previous_location: job.location,
      created_at: removalDate.toISOString()
    });
    
    // Update the job status to inactive
    await supabase
      .from('jobs')
      .update({
        status: 'inactive',
        last_change: removalDate.toISOString()
      })
      .eq('id', job.id);
  }

  // 4. Stale jobs (for some jobs)
  const jobsToMarkStale = jobs.filter(job => 
    !jobsToRemove.includes(job) && Math.random() > 0.9
  ); // 10% of remaining jobs get marked stale
  
  for (const job of jobsToMarkStale) {
    // Create a stale date after creation
    const staleDate = new Date(job.created_at);
    staleDate.setDate(staleDate.getDate() + 65); // 65 days after creation (past the 60-day threshold)
    
    changes.push({
      id: uuidv4(),
      job_id: job.id,
      company_id: job.company_id,
      change_type: 'marked_stale',
      previous_title: job.title,
      created_at: staleDate.toISOString()
    });
    
    // Update the job status to stale
    await supabase
      .from('jobs')
      .update({
        status: 'stale',
        last_change: staleDate.toISOString()
      })
      .eq('id', job.id);
  }

  // 5. Reactivated jobs (for some removed jobs)
  const jobsToReactivate = jobsToRemove.filter(() => Math.random() > 0.7); // 30% of removed jobs get reactivated
  
  for (const job of jobsToReactivate) {
    // Get the removal change to find the removal date
    const { data: removalChanges } = await supabase
      .from('job_changes')
      .select('*')
      .eq('job_id', job.id)
      .eq('change_type', 'removed')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (removalChanges && removalChanges.length > 0) {
      // Create a reactivation date after removal
      const removalDate = new Date(removalChanges[0].created_at);
      const reactivationDate = new Date(removalDate);
      reactivationDate.setDate(reactivationDate.getDate() + Math.floor(Math.random() * 30) + 5); // 5-35 days after removal
      
      changes.push({
        id: uuidv4(),
        job_id: job.id,
        company_id: job.company_id,
        change_type: 'added', // Reactivation is treated as an addition
        new_title: job.title,
        new_location: job.location,
        created_at: reactivationDate.toISOString()
      });
      
      // Update the job status to active
      await supabase
        .from('jobs')
        .update({
          status: 'active',
          last_change: reactivationDate.toISOString(),
          last_seen_active: reactivationDate.toISOString()
        })
        .eq('id', job.id);
    }
  }

  // Insert all changes
  const { error } = await supabase
    .from('job_changes')
    .insert(changes);

  if (error) {
    console.error('Error inserting job changes:', error);
    return 0;
  }

  return changes.length;
}

// Run the script
generateTestData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  }); 