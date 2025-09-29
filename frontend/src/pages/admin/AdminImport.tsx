import React, { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { importAPI } from '@/lib/api'
import { UserRole } from '@/types'
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Users,
  FileSpreadsheet
} from 'lucide-react'

// Mock UI components - replace with actual shadcn/ui components when available
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>{children}</div>
)
const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 pb-4">{children}</div>
)
const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h3>
)
const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{children}</p>
)
const CardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 pt-0">{children}</div>
)
const Button = ({ children, className = '', variant = 'default', size = 'default', disabled = false, onClick, ...props }: any) => (
  <button 
    className={`px-4 py-2 rounded-md font-medium transition-colors ${
      variant === 'outline' ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white' :
      variant === 'destructive' ? 'bg-red-600 text-white hover:bg-red-700' :
      variant === 'ghost' ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white' :
      'bg-blue-600 text-white hover:bg-blue-700'
    } ${size === 'sm' ? 'px-3 py-1 text-sm' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    disabled={disabled}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
)
const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: string }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
    variant === 'secondary' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' :
    variant === 'destructive' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400' :
    variant === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
    'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
  }`}>
    {children}
  </span>
)

interface ImportResult {
  success: boolean
  message: string
  imported: number
  errors: Array<{
    row: number
    field: string
    message: string
  }>
}

const AdminImport: React.FC = () => {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Import mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => importAPI.importStudents(file),
    onSuccess: (response) => {
      setImportResult(response.data)
      setSelectedFile(null)
    },
    onError: (error: any) => {
      setImportResult({
        success: false,
        message: error.response?.data?.message || 'Import failed',
        imported: 0,
        errors: error.response?.data?.errors || []
      })
    }
  })

  const handleFileSelect = (file: File) => {
    if (file.type === 'text/csv' || file.name.endsWith('.csv') || 
        file.type === 'application/vnd.ms-excel' || 
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      setSelectedFile(file)
      setImportResult(null)
    } else {
      alert('Please select a CSV or Excel file')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile)
    }
  }

  const downloadTemplate = () => {
    // Create CSV template
    const csvContent = 'name,phoneNumber,email\n"John Doe","+8801234567890","john@example.com"\n"Jane Smith","+8801234567891","jane@example.com"'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 bg-background dark:bg-gray-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Import</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Bulk import students from CSV or Excel files
            {user?.role === UserRole.BRANCH_ADMIN && ` to ${user.branchId}`}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={downloadTemplate}
        >
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Import Instructions</span>
          </CardTitle>
          <CardDescription>
            Follow these guidelines for successful student import
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">File Requirements</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• CSV or Excel (.xlsx) format</li>
                  <li>• Maximum 1000 students per file</li>
                  <li>• File size limit: 5MB</li>
                  <li>• UTF-8 encoding recommended</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Required Columns</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>name</strong>: Student full name</li>
                  <li>• <strong>phoneNumber</strong>: Valid phone number with country code</li>
                  <li>• <strong>email</strong>: Valid email address (optional)</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Important Notes</h4>
                  <ul className="text-sm text-blue-800 mt-1 space-y-1">
                    <li>• Phone numbers must be unique across the system</li>
                    <li>• Students will be assigned to your branch automatically</li>
                    <li>• Invalid rows will be skipped with detailed error reports</li>
                    <li>• Existing students with same phone numbers will be skipped</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Upload File</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <FileSpreadsheet className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <div className="flex justify-center space-x-3">
                  <Button
                    onClick={handleImport}
                    disabled={importMutation.isPending}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {importMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Import Students
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedFile(null)}
                    disabled={importMutation.isPending}
                  >
                    Remove File
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Supports CSV and Excel files up to 5MB
                  </p>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Select File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {importResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span>Import Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary */}
              <div className={`p-4 rounded-lg ${
                importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {importResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-medium ${
                    importResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {importResult.message}
                  </span>
                </div>
                
                {importResult.imported > 0 && (
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800">
                      {importResult.imported} students imported successfully
                    </span>
                  </div>
                )}
              </div>

              {/* Errors */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Import Errors ({importResult.errors.length})
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="flex items-start space-x-2 text-sm">
                          <Badge variant="destructive">Row {error.row}</Badge>
                          <span className="text-red-800">
                            <strong>{error.field}:</strong> {error.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setImportResult(null)}
                >
                  Clear Results
                </Button>
                {importResult.success && (
                  <Button
                    onClick={() => {
                      setImportResult(null)
                      setSelectedFile(null)
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Import More Students
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AdminImport