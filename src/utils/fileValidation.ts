/**
 * File validation utilities for LexiQ
 */

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
export const MAX_FILES = 25;

// Monolingual file extensions (target text only)
export const MONOLINGUAL_EXTENSIONS = [
  '.txt', '.doc', '.docx', '.odt', 
  '.json', '.yml', '.csv', '.xlsx'
];

// Bilingual file extensions (source + target text)
export const BILINGUAL_EXTENSIONS = [
  '.sdlxliff', '.mqxliff', '.txlf', '.mqxlz', '.mxliff',
  '.xlsx', '.xlsm', '.xliff', '.xlf', '.xlif', 
  '.tmx', '.po', '.csv'
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file type based on extension and project type
 */
export const validateFileType = (
  file: File, 
  projectType?: 'monolingual' | 'bilingual'
): FileValidationResult => {
  // If no project type specified, allow all formats
  let validExtensions: string[];
  
  if (!projectType) {
    validExtensions = [...MONOLINGUAL_EXTENSIONS, ...BILINGUAL_EXTENSIONS];
  } else if (projectType === 'monolingual') {
    validExtensions = MONOLINGUAL_EXTENSIONS;
  } else {
    validExtensions = BILINGUAL_EXTENSIONS;
  }
  
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!validExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: `Invalid file type for ${projectType || 'this'} project. Supported formats: ${validExtensions.join(', ')}`
    };
  }
  
  return { valid: true };
};

/**
 * Validates file size (max 20MB)
 */
export const validateFileSize = (file: File): FileValidationResult => {
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File size (${sizeMB}MB) exceeds maximum allowed size of ${maxMB}MB`
    };
  }
  
  return { valid: true };
};

/**
 * Comprehensive file validation with project type support
 */
export const validateFile = (
  file: File, 
  projectType?: 'monolingual' | 'bilingual'
): FileValidationResult => {
  const typeValidation = validateFileType(file, projectType);
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }
  
  return { valid: true };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
