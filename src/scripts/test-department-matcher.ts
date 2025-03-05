import { matchDepartment, fetchDepartments } from '../lib/department-matcher';

// Sample job data for testing
const testJobs = [
  {
    title: 'Senior Software Engineer',
    description: 'We are looking for a senior software engineer to join our team.',
    rawDepartment: 'Engineering',
  },
  {
    title: 'Data Scientist',
    description: 'Join our data team to build machine learning models.',
    rawDepartment: 'Data Science',
  },
  {
    title: 'UX Designer',
    description: 'Design beautiful and intuitive user interfaces.',
    rawDepartment: 'Design',
  },
  {
    title: 'Account Executive',
    description: 'Drive revenue growth through sales of our enterprise products.',
    rawDepartment: 'Sales',
  },
  {
    title: 'Content Marketing Manager',
    description: 'Create compelling content to drive brand awareness.',
    rawDepartment: 'Marketing',
  },
  {
    title: 'Customer Success Manager',
    description: 'Ensure our customers are successful with our products.',
    rawDepartment: 'Customer Success',
  },
  {
    title: 'Business Operations Analyst',
    description: 'Analyze business processes and identify opportunities for improvement.',
    rawDepartment: 'Operations',
  },
  {
    title: 'Talent Acquisition Specialist',
    description: 'Help us find and hire the best talent.',
    rawDepartment: 'People',
  },
  {
    title: 'Financial Analyst',
    description: 'Prepare financial reports and analyze financial data.',
    rawDepartment: 'Finance',
  },
  {
    title: 'Legal Counsel',
    description: 'Provide legal advice and support to the company.',
    rawDepartment: 'Legal',
  },
  // Edge cases
  {
    title: 'Full Stack Developer',
    description: 'Build web applications using modern technologies.',
    rawDepartment: null,
  },
  {
    title: 'Office Manager',
    description: 'Manage office operations and facilities.',
    rawDepartment: 'Administration',
  },
  {
    title: 'Product Manager',
    description: 'Define product strategy and roadmap.',
    rawDepartment: 'Product',
  },
];

/**
 * Test the department matcher
 */
async function testDepartmentMatcher() {
  console.log('Testing department matcher...');

  // Fetch all departments first
  const departments = await fetchDepartments();
  console.log(`Found ${departments.length} departments in the database`);

  if (departments.length === 0) {
    console.error('No departments found. Please run init-departments.ts first.');
    process.exit(1);
  }

  // Print department names and keyword counts
  console.log('\nDepartment information:');
  departments.forEach(dept => {
    console.log(`- ${dept.name}: ${dept.keywords.length} keywords`);
  });

  // Test each job
  console.log('\nTesting job matching:');
  for (const job of testJobs) {
    const departmentId = await matchDepartment(
      job.title,
      job.description,
      job.rawDepartment
    );

    const matchedDepartment = departmentId
      ? departments.find(d => d.id === departmentId)?.name
      : 'No match';

    console.log(
      `Job: "${job.title}" (Raw: ${job.rawDepartment || 'None'}) => Matched: ${matchedDepartment}`
    );
  }

  console.log('\nDepartment matcher testing complete!');
}

// Run the test
testDepartmentMatcher(); 