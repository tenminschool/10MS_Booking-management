// Simple test to check if AdminReports component can be imported
import React from 'react';
import AdminReports from './pages/admin/AdminReports';

// This file is just to test if the component can be imported without errors
console.log('AdminReports component imported successfully:', AdminReports);

export default function TestAdminReports() {
  return (
    <div>
      <h1>Testing AdminReports Import</h1>
      <p>If you can see this, the AdminReports component imports are working.</p>
    </div>
  );
}