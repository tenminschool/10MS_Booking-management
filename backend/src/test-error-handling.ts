import express from 'express';
import { z } from 'zod';
import { 
  ValidationError, 
  BusinessRuleError, 
  NotFoundError, 
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  RateLimitError,
  globalErrorHandler,
  asyncHandler,
  businessRules
} from './middleware/errorHandler';
import { validateBody, validateQuery, validateParams } from './middleware/validation';

const app = express();
app.use(express.json());

// Test schemas
const testBodySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  age: z.number().min(18, 'Must be at least 18 years old'),
});

const testQuerySchema = z.object({
  page: z.coerce.number().min(1, 'Page must be at least 1'),
  limit: z.coerce.number().min(1).max(100, 'Limit must be between 1 and 100'),
});

const testParamsSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{25}$/, 'Invalid ID format'),
});

// Test routes for different error types
app.post('/test/validation-error', validateBody(testBodySchema), asyncHandler(async (req, res) => {
  res.json({ message: 'Validation passed', data: req.body });
}));

app.get('/test/query-validation', validateQuery(testQuerySchema), asyncHandler(async (req, res) => {
  res.json({ message: 'Query validation passed', query: req.query });
}));

app.get('/test/params-validation/:id', validateParams(testParamsSchema), asyncHandler(async (req, res) => {
  res.json({ message: 'Params validation passed', params: req.params });
}));

app.post('/test/business-rule-error', asyncHandler(async (req, res) => {
  throw new BusinessRuleError('Cannot book more than one slot per month', 'MONTHLY_BOOKING_LIMIT');
}));

app.get('/test/not-found-error', asyncHandler(async (req, res) => {
  throw new NotFoundError('User not found');
}));

app.get('/test/auth-error', asyncHandler(async (req, res) => {
  throw new AuthenticationError('Invalid credentials');
}));

app.get('/test/authorization-error', asyncHandler(async (req, res) => {
  throw new AuthorizationError('Insufficient permissions');
}));

app.get('/test/conflict-error', asyncHandler(async (req, res) => {
  throw new ConflictError('Email already exists', 'DUPLICATE_EMAIL');
}));

app.get('/test/rate-limit-error', asyncHandler(async (req, res) => {
  throw new RateLimitError('Too many requests', 60);
}));

app.post('/test/business-rules', asyncHandler(async (req, res) => {
  const { slotDate, slotStartTime, bookedCount, capacity, hasMonthlyBooking } = req.body;

  // Test business rule validations
  if (slotDate && slotStartTime) {
    businessRules.validateSlotNotInPast(new Date(slotDate), slotStartTime);
    businessRules.validateCancellationTime(new Date(slotDate), slotStartTime);
  }

  if (bookedCount !== undefined && capacity !== undefined) {
    businessRules.validateSlotCapacity(bookedCount, capacity);
  }

  if (hasMonthlyBooking !== undefined) {
    businessRules.validateMonthlyLimit(hasMonthlyBooking);
  }

  res.json({ message: 'All business rules passed' });
}));

app.get('/test/unexpected-error', asyncHandler(async (req, res) => {
  // Simulate an unexpected error
  const obj: any = null;
  obj.someProperty.access(); // This will throw a TypeError
}));

// Add global error handler
app.use(globalErrorHandler);

const PORT = 3002;

app.listen(PORT, () => {
  console.log(`🧪 Error handling test server running on port ${PORT}`);
  console.log('\n📋 Test endpoints:');
  console.log('POST /test/validation-error - Test validation errors');
  console.log('GET  /test/query-validation?page=0&limit=200 - Test query validation');
  console.log('GET  /test/params-validation/invalid-id - Test params validation');
  console.log('POST /test/business-rule-error - Test business rule errors');
  console.log('GET  /test/not-found-error - Test not found errors');
  console.log('GET  /test/auth-error - Test authentication errors');
  console.log('GET  /test/authorization-error - Test authorization errors');
  console.log('GET  /test/conflict-error - Test conflict errors');
  console.log('GET  /test/rate-limit-error - Test rate limit errors');
  console.log('POST /test/business-rules - Test business rule validations');
  console.log('GET  /test/unexpected-error - Test unexpected errors');
  console.log('\n🔧 Example test commands:');
  console.log('curl -X POST http://localhost:3002/test/validation-error -H "Content-Type: application/json" -d \'{"name": "A", "email": "invalid", "age": 15}\'');
  console.log('curl "http://localhost:3002/test/query-validation?page=0&limit=200"');
  console.log('curl "http://localhost:3002/test/params-validation/invalid-id"');
  console.log('curl -X POST http://localhost:3002/test/business-rules -H "Content-Type: application/json" -d \'{"slotDate": "2023-01-01", "slotStartTime": "10:00", "bookedCount": 5, "capacity": 3, "hasMonthlyBooking": true}\'');
});

export default app;