import { supabase } from './supabase';
import { Department } from '../types/database';

/**
 * Cache for departments to avoid repeated database queries
 */
let departmentsCache: Department[] | null = null;

/**
 * Fetch all departments from the database
 * @returns Array of departments
 */
export async function fetchDepartments(): Promise<Department[]> {
  if (departmentsCache) {
    return departmentsCache;
  }

  const { data, error } = await supabase.from('departments').select('*');

  if (error) {
    console.error('Error fetching departments:', error);
    return [];
  }

  departmentsCache = data as Department[];
  return departmentsCache;
}

/**
 * Clear the departments cache to force a fresh fetch
 */
export function clearDepartmentsCache(): void {
  departmentsCache = null;
}

/**
 * Match a job to a department based on title and description
 * @param title Job title
 * @param description Job description
 * @param rawDepartment Raw department text from job posting
 * @returns Department ID if matched, null otherwise
 */
export async function matchDepartment(
  title: string,
  description: string | null,
  rawDepartment: string | null
): Promise<string | null> {
  const departments = await fetchDepartments();
  
  if (departments.length === 0) {
    console.warn('No departments found for matching');
    return null;
  }

  // Normalize text for matching
  const normalizedTitle = title.toLowerCase();
  const normalizedDescription = description ? description.toLowerCase() : '';
  const normalizedRawDepartment = rawDepartment ? rawDepartment.toLowerCase() : '';
  
  // First, try to match based on raw department if available
  if (rawDepartment) {
    for (const department of departments) {
      // Exact match on department name
      if (normalizedRawDepartment === department.name.toLowerCase()) {
        return department.id;
      }
      
      // Check if any keyword is in the raw department
      for (const keyword of department.keywords) {
        if (normalizedRawDepartment.includes(keyword.toLowerCase())) {
          return department.id;
        }
      }
    }
  }
  
  // Next, try to match based on title
  for (const department of departments) {
    // Check if department name is in the title
    if (normalizedTitle.includes(department.name.toLowerCase())) {
      return department.id;
    }
    
    // Check if any keyword is in the title
    for (const keyword of department.keywords) {
      if (normalizedTitle.includes(keyword.toLowerCase())) {
        return department.id;
      }
    }
  }
  
  // Finally, try to match based on description if available
  if (description) {
    for (const department of departments) {
      // Check if department name is in the description
      if (normalizedDescription.includes(department.name.toLowerCase())) {
        return department.id;
      }
      
      // Check if any keyword is in the description
      for (const keyword of department.keywords) {
        if (normalizedDescription.includes(keyword.toLowerCase())) {
          return department.id;
        }
      }
    }
  }
  
  // No match found
  return null;
}

/**
 * Update department keywords programmatically
 * @param departmentId Department ID
 * @param keywords Array of keywords to set
 * @returns Success status
 */
export async function updateDepartmentKeywords(
  departmentId: string,
  keywords: string[]
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('departments')
      .update({ keywords })
      .eq('id', departmentId);

    if (error) {
      console.error('Error updating department keywords:', error);
      return false;
    }

    // Clear cache to ensure fresh data on next fetch
    clearDepartmentsCache();
    return true;
  } catch (error) {
    console.error('Error updating department keywords:', error);
    return false;
  }
}

/**
 * Add keywords to a department
 * @param departmentId Department ID
 * @param newKeywords Array of keywords to add
 * @returns Success status
 */
export async function addDepartmentKeywords(
  departmentId: string,
  newKeywords: string[]
): Promise<boolean> {
  try {
    // Get current department
    const { data, error } = await supabase
      .from('departments')
      .select('keywords')
      .eq('id', departmentId)
      .single();

    if (error) {
      console.error('Error fetching department:', error);
      return false;
    }

    // Combine existing and new keywords, removing duplicates
    const existingKeywords = data.keywords || [];
    const combinedKeywords = [...new Set([...existingKeywords, ...newKeywords])];

    // Update department with combined keywords
    return await updateDepartmentKeywords(departmentId, combinedKeywords);
  } catch (error) {
    console.error('Error adding department keywords:', error);
    return false;
  }
} 