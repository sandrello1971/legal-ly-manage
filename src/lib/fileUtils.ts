/**
 * Calculate SHA-256 hash of a file
 * @param file - The file to hash
 * @returns Promise with the hex string of the hash
 */
export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Check if a file already exists based on its hash
 * @param fileHash - The hash of the file to check
 * @returns Promise with boolean indicating if file exists
 */
export async function checkDuplicateFile(
  fileHash: string,
  supabaseClient: any
): Promise<{ isDuplicate: boolean; existingExpense?: any }> {
  const { data, error } = await supabaseClient
    .from('project_expenses')
    .select('id, description, supplier_name, amount, receipt_number')
    .eq('file_hash', fileHash)
    .limit(1);

  if (error) {
    console.error('Error checking for duplicate file:', error);
    return { isDuplicate: false };
  }

  if (data && data.length > 0) {
    return { isDuplicate: true, existingExpense: data[0] };
  }

  return { isDuplicate: false };
}
