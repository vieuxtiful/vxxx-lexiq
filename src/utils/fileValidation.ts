/**
 * File validation utilities for LexiQ
 */

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
export const MAX_FILES = 25;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file type based on extension
 */
export const validateFileType = (file: File): FileValidationResult => {
  const validExtensions = [
    '.txt', '.docx', '.json', '.csv', '.xml', 
    '.po', '.tmx', '.xliff', '.xlf'
  ];
  
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!validExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: `Invalid file type. Supported formats: ${validExtensions.join(', ')}`
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
 * Comprehensive file validation
 */
export const validateFile = (file: File): FileValidationResult => {
  const typeValidation = validateFileType(file);
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
