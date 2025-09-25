#!/usr/bin/env node

const http = require('http');

function checkPort(port, host = 'localhost') {
  return new Promise((resolve) => {
    const req = http.request({
      host,
      port,
      method: 'GET',
      path: '/',
      timeout: 2000
    }, (res) => {
      resolve({
        port,
        status: 'running',
        statusCode: res.statusCode,
        message: `Server running on port ${port}`
      });
    });

    req.on('error', () => {
      resolve({
        port,
        status: 'not running',
        message: `No server found on port ${port}`
      });
    });

    req.on('timeout', () => {
      resolve({
        port,
        status: 'timeout',
        message: `Server on port ${port} timed out`
      });
    });

    req.end();
  });
}

async function checkServers() {
  console.log('🔍 Checking server status...\n');
  
  const ports = [3000, 3001, 5173, 5174, 5175, 4173];
  const results = await Promise.all(ports.map(port => checkPort(port)));
  
  results.forEach(result => {
    const icon = result.status === 'running' ? '✅' : '❌';
    console.log(`${icon} Port ${result.port}: ${result.message}`);
  });
  
  console.log('\n📋 Port Information:');
  console.log('• Port 3001: Backend API server');
  console.log('• Port 3000: Frontend development server (alternative)');
  console.log('• Port 5173: Vite development server (default)');
  console.log('• Port 4173: Vite preview server');
  
  const runningPorts = results.filter(r => r.status === 'running');
  if (runningPorts.length > 0) {
    console.log('\n🚀 Available servers:');
    runningPorts.forEach(result => {
      if (result.port === 3001) {
        console.log(`• Backend API: http://localhost:${result.port}`);
        console.log(`• Health check: http://localhost:${result.port}/health`);
      } else {
        console.log(`• Frontend: http://localhost:${result.port}`);
      }
    });
  } else {
    console.log('\n⚠️  No servers are currently running');
    console.log('To start servers:');
    console.log('• Backend: cd backend && npm run dev');
    console.log('• Frontend: cd frontend && npm run dev');
    console.log('• Both: npm run dev (from root)');
  }
}

checkServers().catch(console.error);