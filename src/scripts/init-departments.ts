import { supabase } from '../lib/supabase';
import { Department } from '../types/database';

// Department mapping from the provided document
const departmentMappings: { name: string; keywords: string[] }[] = [
  {
    name: 'Engineering',
    keywords: [
      'software development',
      'software engineer',
      'hardware engineering',
      'it infrastructure',
      'cybersecurity',
      'devops',
      'sre',
      'security',
      'developer',
      'frontend',
      'backend',
      'fullstack',
      'full stack',
      'web developer',
      'mobile developer',
      'ios',
      'android',
      'qa',
      'quality assurance',
      'test engineer',
      'infrastructure',
      'cloud',
      'aws',
      'azure',
      'gcp',
      'site reliability',
      'systems',
      'network',
      'platform',
    ],
  },
  {
    name: 'Data',
    keywords: [
      'data engineer',
      'data scientist',
      'data analyst',
      'business intelligence',
      'bi',
      'analytics',
      'machine learning',
      'ml',
      'ai',
      'artificial intelligence',
      'data science',
      'data architecture',
      'etl',
      'data warehouse',
      'data modeling',
    ],
  },
  {
    name: 'Design',
    keywords: [
      'user research',
      'ux',
      'ui',
      'product design',
      'interaction design',
      'motion design',
      'brand design',
      'graphic design',
      'visual design',
      'user experience',
      'user interface',
      'ux/ui',
      'ui/ux',
      'creative',
      'designer',
    ],
  },
  {
    name: 'Sales',
    keywords: [
      'revenue generation',
      'business development',
      'partnerships',
      'b2b sales',
      'b2c sales',
      'business development',
      'account executive',
      'sales representative',
      'sales manager',
      'sales director',
      'sales operations',
      'sales enablement',
      'inside sales',
      'outside sales',
      'enterprise sales',
      'solution sales',
      'technical sales',
    ],
  },
  {
    name: 'Marketing',
    keywords: [
      'brand strategy',
      'content marketing',
      'performance marketing',
      'pr',
      'public relations',
      'product marketing',
      'gtm',
      'go to market',
      'demand generation',
      'growth',
      'seo',
      'sem',
      'social media',
      'digital marketing',
      'email marketing',
      'events',
      'communications',
      'brand',
      'marketing operations',
    ],
  },
  {
    name: 'Customer Success',
    keywords: [
      'client retention',
      'onboarding',
      'technical support',
      'user engagement',
      'customer experience',
      'product support',
      'solutions',
      'customer service',
      'customer support',
      'account management',
      'client success',
      'client services',
      'implementation',
      'customer advocacy',
      'customer happiness',
    ],
  },
  {
    name: 'Operations',
    keywords: [
      'strategy',
      'operations associate',
      'business operations',
      'business analyst',
      'mergers & acquisitions',
      'market research',
      'strategic planning',
      'program management',
      'project management',
      'product operations',
      'process improvement',
      'business systems',
      'operations manager',
    ],
  },
  {
    name: 'People',
    keywords: [
      'talent acquisition',
      'benefits',
      'employee experience',
      'dei',
      'diversity',
      'equity',
      'inclusion',
      'recruiting',
      'learning and development',
      'hr',
      'human resources',
      'people operations',
      'talent',
      'culture',
      'organizational development',
      'compensation',
      'people analytics',
    ],
  },
  {
    name: 'Finance & Accounting',
    keywords: [
      'financial planning',
      'budgeting',
      'audits',
      'payroll',
      'tax',
      'investor relations',
      'accounting',
      'controller',
      'treasury',
      'financial analysis',
      'fp&a',
      'finance',
      'accounts payable',
      'accounts receivable',
      'revenue operations',
    ],
  },
  {
    name: 'Legal & Compliance',
    keywords: [
      'regulatory affairs',
      'contracts',
      'intellectual property',
      'governance',
      'general counsel',
      'legal',
      'compliance',
      'privacy',
      'data protection',
      'corporate counsel',
      'patent',
      'trademark',
      'licensing',
      'ethics',
    ],
  },
];

/**
 * Initialize departments in the database
 */
async function initDepartments() {
  console.log('Initializing departments...');

  try {
    // Check if departments already exist
    const { data: existingDepartments, error: fetchError } = await supabase
      .from('departments')
      .select('name');

    if (fetchError) {
      throw new Error(`Error fetching departments: ${fetchError.message}`);
    }

    const existingDepartmentNames = existingDepartments?.map(d => d.name) || [];
    console.log(`Found ${existingDepartmentNames.length} existing departments`);

    // Filter out departments that already exist
    const departmentsToInsert = departmentMappings.filter(
      dept => !existingDepartmentNames.includes(dept.name)
    );

    if (departmentsToInsert.length === 0) {
      console.log('All departments already exist. No new departments to insert.');
      return;
    }

    console.log(`Inserting ${departmentsToInsert.length} new departments...`);

    // Insert departments
    const { data, error } = await supabase
      .from('departments')
      .insert(departmentsToInsert)
      .select();

    if (error) {
      throw new Error(`Error inserting departments: ${error.message}`);
    }

    console.log(`Successfully inserted ${data?.length || 0} departments`);
    console.log('Department initialization complete!');
  } catch (error) {
    console.error('Error initializing departments:', error);
    process.exit(1);
  }
}

// Run the initialization
initDepartments(); 