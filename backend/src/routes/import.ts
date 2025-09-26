import { Router } from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import { authenticate, requireRole, requireBranchAccess } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { validateBangladeshPhone } from '../middleware/phoneValidation';
import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';
import { Readable } from 'stream';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV and Excel files
    const allowedMimes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
});

interface StudentImportRow {
  name: string;
  phoneNumber: string;
  email?: string;
  row: number;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    field: string;
    value: string;
    error: string;
  }>;
  duplicates: Array<{
    row: number;
    phoneNumber: string;
    existingUser: string;
  }>;
  created: Array<{
    id: string;
    name: string;
    phoneNumber: string;
  }>;
}

// Parse CSV data from buffer
const parseCSV = (buffer: Buffer): Promise<StudentImportRow[]> => {
  return new Promise((resolve, reject) => {
    const results: StudentImportRow[] = [];
    let rowNumber = 1; // Start from 1 (header is row 0)
    
    const stream = Readable.from(buffer.toString());
    
    stream
      .pipe(csvParser({
        headers: ['name', 'phoneNumber', 'email'] // Expected column order
      } as any))
      .on('data', (data) => {
        rowNumber++;
        results.push({
          name: data.name?.trim() || '',
          phoneNumber: data.phoneNumber?.trim() || '',
          email: data.email?.trim() || undefined,
          row: rowNumber
        });
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// Validate student data
const validateStudentData = (data: StudentImportRow[]): ImportResult => {
  const result: ImportResult = {
    success: false,
    totalRows: data.length,
    successCount: 0,
    errorCount: 0,
    errors: [],
    duplicates: [],
    created: []
  };

  const phoneNumbers = new Set<string>();

  for (const student of data) {
    let hasError = false;

    // Validate name
    if (!student.name || student.name.length < 2) {
      result.errors.push({
        row: student.row,
        field: 'name',
        value: student.name,
        error: 'Name must be at least 2 characters long'
      });
      hasError = true;
    }

    // Validate phone number
    if (!student.phoneNumber) {
      result.errors.push({
        row: student.row,
        field: 'phoneNumber',
        value: student.phoneNumber,
        error: 'Phone number is required'
      });
      hasError = true;
    } else {
      const phoneValidation = validateBangladeshPhone(student.phoneNumber);
      if (!phoneValidation.isValid) {
        result.errors.push({
          row: student.row,
          field: 'phoneNumber',
          value: student.phoneNumber,
          error: phoneValidation.error || 'Invalid phone number format'
        });
        hasError = true;
      } else {
        // Check for duplicates within the file
        if (phoneNumbers.has(phoneValidation.formatted)) {
          result.errors.push({
            row: student.row,
            field: 'phoneNumber',
            value: student.phoneNumber,
            error: 'Duplicate phone number in file'
          });
          hasError = true;
        } else {
          phoneNumbers.add(phoneValidation.formatted);
          // Update with formatted phone number
          student.phoneNumber = phoneValidation.formatted;
        }
      }
    }

    // Validate email if provided
    if (student.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(student.email)) {
        result.errors.push({
          row: student.row,
          field: 'email',
          value: student.email,
          error: 'Invalid email format'
        });
        hasError = true;
      }
    }

    if (hasError) {
      result.errorCount++;
    } else {
      result.successCount++;
    }
  }

  result.success = result.errorCount === 0;
  return result;
};

// Get import template
router.get('/template', 
  authenticate, 
  requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]),
  (req, res) => {
    try {
      // Generate CSV template
      const template = 'name,phoneNumber,email\n' +
                      'John Doe,+8801712345678,john@example.com\n' +
                      'Jane Smith,+8801812345679,jane@example.com\n' +
                      'Ahmed Rahman,+8801912345680,';

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="student_import_template.csv"');
      res.send(template);

    } catch (error) {
      console.error('Get template error:', error);
      res.status(500).json({
        error: 'Failed to generate template',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

// Preview import data
router.post('/preview', 
  authenticate, 
  requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]),
  auditLog('import_preview'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please upload a CSV file'
        });
      }

      // Parse CSV
      const studentData = await parseCSV(req.file.buffer);
      
      if (studentData.length === 0) {
        return res.status(400).json({
          error: 'Empty file',
          message: 'The uploaded file contains no data'
        });
      }

      // Validate data
      const validationResult = validateStudentData(studentData);

      // Check for existing users in database
      const phoneNumbers = studentData
        .filter(s => s.phoneNumber)
        .map(s => s.phoneNumber);

      if (phoneNumbers.length > 0) {
        const existingUsers = await prisma.user.findMany({
          where: {
            phoneNumber: { in: phoneNumbers }
          },
          select: {
            id: true,
            name: true,
            phoneNumber: true
          }
        });

        // Mark duplicates
        for (const student of studentData) {
          const existing = existingUsers.find(u => u.phoneNumber === student.phoneNumber);
          if (existing) {
            validationResult.duplicates.push({
              row: student.row,
              phoneNumber: student.phoneNumber,
              existingUser: existing.name
            });
            validationResult.successCount--;
            validationResult.errorCount++;
          }
        }
      }

      res.json({
        preview: {
          filename: req.file.originalname,
          fileSize: req.file.size,
          totalRows: validationResult.totalRows,
          validRows: validationResult.successCount,
          errorRows: validationResult.errorCount,
          duplicateRows: validationResult.duplicates.length
        },
        validation: validationResult,
        sampleData: studentData.slice(0, 5) // Show first 5 rows as preview
      });

    } catch (error) {
      console.error('Preview import error:', error);
      res.status(500).json({
        error: 'Failed to preview import',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

// Import students
router.post('/students', 
  authenticate, 
  requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]),
  requireBranchAccess,
  upload.single('file'),
  auditLog('student_bulk_import'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please upload a CSV file'
        });
      }

      const { branchId } = req.body;
      
      // Determine target branch
      let targetBranchId: string;
      if (req.user?.role === UserRole.SUPER_ADMIN) {
        if (!branchId) {
          return res.status(400).json({
            error: 'Branch required',
            message: 'Super admins must specify a target branch for import'
          });
        }
        targetBranchId = branchId;
      } else {
        // Branch admin can only import to their own branch
        targetBranchId = req.user?.branchId!;
      }

      // Verify branch exists
      const branch = await prisma.branch.findUnique({
        where: { id: targetBranchId },
        select: { id: true, name: true }
      });

      if (!branch) {
        return res.status(404).json({
          error: 'Branch not found',
          message: 'Target branch does not exist'
        });
      }

      // Parse CSV
      const studentData = await parseCSV(req.file.buffer);
      
      if (studentData.length === 0) {
        return res.status(400).json({
          error: 'Empty file',
          message: 'The uploaded file contains no data'
        });
      }

      // Validate data
      const validationResult = validateStudentData(studentData);

      // Check for existing users
      const phoneNumbers = studentData
        .filter(s => s.phoneNumber)
        .map(s => s.phoneNumber);

      if (phoneNumbers.length > 0) {
        const existingUsers = await prisma.user.findMany({
          where: {
            phoneNumber: { in: phoneNumbers }
          },
          select: {
            id: true,
            name: true,
            phoneNumber: true
          }
        });

        // Mark duplicates
        for (const student of studentData) {
          const existing = existingUsers.find(u => u.phoneNumber === student.phoneNumber);
          if (existing) {
            validationResult.duplicates.push({
              row: student.row,
              phoneNumber: student.phoneNumber,
              existingUser: existing.name
            });
          }
        }
      }

      // Only import valid, non-duplicate students
      const studentsToImport = studentData.filter(student => {
        const hasValidationError = validationResult.errors.some(e => e.row === student.row);
        const isDuplicate = validationResult.duplicates.some(d => d.row === student.row);
        return !hasValidationError && !isDuplicate;
      });

      // Create students in database
      const createdStudents = [];
      for (const student of studentsToImport) {
        try {
          const createdUser = await prisma.user.create({
            data: {
              name: student.name,
              phoneNumber: student.phoneNumber,
              email: student.email || null,
              role: UserRole.STUDENT,
              branchId: targetBranchId,
              isActive: true
            },
            select: {
              id: true,
              name: true,
              phoneNumber: true
            }
          });

          createdStudents.push(createdUser);
          validationResult.created.push({
            ...createdUser,
            phoneNumber: createdUser.phoneNumber || ''
          });
        } catch (error) {
          console.error(`Failed to create student ${student.name}:`, error);
          validationResult.errors.push({
            row: student.row,
            field: 'database',
            value: student.name,
            error: 'Failed to create user in database'
          });
        }
      }

      const finalResult = {
        success: createdStudents.length > 0,
        branch: branch,
        import: {
          filename: req.file.originalname,
          totalRows: validationResult.totalRows,
          processedRows: studentsToImport.length,
          createdCount: createdStudents.length,
          errorCount: validationResult.errors.length,
          duplicateCount: validationResult.duplicates.length
        },
        validation: validationResult
      };

      res.status(201).json({
        message: `Successfully imported ${createdStudents.length} students`,
        result: finalResult
      });

    } catch (error) {
      console.error('Import students error:', error);
      res.status(500).json({
        error: 'Failed to import students',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

export default router;