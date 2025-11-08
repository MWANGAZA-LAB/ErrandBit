// Quick test to check if .env is loaded
import dotenv from 'dotenv';

dotenv.config();

console.log('=== Environment Variables Test ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ NOT SET');
console.log('PORT:', process.env.PORT || 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
console.log('');

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in .env file');
  console.log('');
  console.log('Make sure your .env file exists at:');
  console.log('  c:\\Users\\mwang\\Desktop\\ErrandBit\\backend\\.env');
  console.log('');
  console.log('And contains:');
  console.log('  DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/errandbit');
  process.exit(1);
} else {
  console.log('✓ .env file loaded successfully!');
  console.log('DATABASE_URL value:', process.env.DATABASE_URL);
}
