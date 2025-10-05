import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FormError } from '@/components/ui/form-error';
import { useFormSubmission } from '@/hooks/useApiCall';
import { authAPI } from '@/lib/api';
import { loginFormSchema, type LoginFormData } from '@/lib/formValidation';

interface LoginFormProps {
  onSuccess: (data: any) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const { loading, error, execute } = useFormSubmission(
    authAPI.loginStaff,
    {
      successMessage: 'Login successful!',
      onSuccess: (data) => {
        onSuccess(data);
      },
    }
  );

  const onSubmit = async (data: LoginFormData) => {
    await execute(data.email, data.password);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Display API errors */}
        <FormError error={error} />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>
    </Form>
  );
};

interface StudentLoginFormProps {
  onSuccess: (data: any) => void;
  onRequestOTP: (phoneNumber: string) => void;
}

export const StudentLoginForm: React.FC<StudentLoginFormProps> = ({ onSuccess, onRequestOTP }) => {
  const form = useForm({
    resolver: zodResolver(loginFormSchema.pick({ phoneNumber: true, otp: true })),
    defaultValues: {
      phoneNumber: '',
      otp: '',
    },
  });

  const { loading: loginLoading, error: loginError, execute: executeLogin } = useFormSubmission(
    authAPI.loginStudent,
    {
      successMessage: 'Login successful!',
      onSuccess: (data) => {
        onSuccess(data);
      },
    }
  );

  const { loading: otpLoading, error: otpError, execute: executeOTPRequest } = useFormSubmission(
    authAPI.sendOTP,
    {
      successMessage: 'OTP sent successfully!',
    }
  );

  const phoneNumber = form.watch('phoneNumber');
  const otp = form.watch('otp');

  const handleRequestOTP = async () => {
    const phoneResult = await form.trigger('phoneNumber');
    if (phoneResult) {
      await executeOTPRequest(phoneNumber);
      onRequestOTP(phoneNumber || '');
    }
  };

  const onSubmit = async (data: any) => {
    await executeLogin(data.phoneNumber, data.otp);
  };

  const isLoading = loginLoading || otpLoading;
  const error = loginError || otpError;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Display API errors */}
        <FormError error={error} />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="tel"
                  placeholder="+8801XXXXXXXXX"
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <div className="flex-1">
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>OTP Code</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleRequestOTP}
              disabled={isLoading || !phoneNumber}
            >
              {otpLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Send OTP'
              )}
            </Button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !otp}
        >
          {loginLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify & Login'
          )}
        </Button>
      </form>
    </Form>
  );
};