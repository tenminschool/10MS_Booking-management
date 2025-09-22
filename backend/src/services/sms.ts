import axios from 'axios';

interface SMSConfig {
  apiUrl: string;
  apiKey: string;
  senderId?: string;
}

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SMSService {
  private config: SMSConfig;

  constructor() {
    this.config = {
      apiUrl: process.env.SMS_API_URL || '',
      apiKey: process.env.SMS_API_KEY || '',
      senderId: process.env.SMS_SENDER_ID || '10MinSchool',
    };
  }

  async sendSMS(phoneNumber: string, message: string): Promise<SMSResponse> {
    // For development mode, just log the SMS
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 SMS to ${phoneNumber}: ${message}`);
      return {
        success: true,
        messageId: `dev-${Date.now()}`,
      };
    }

    // Production SMS sending
    try {
      if (!this.config.apiUrl || !this.config.apiKey) {
        console.warn('SMS service not configured - missing API URL or API key');
        return {
          success: false,
          error: 'SMS service not configured',
        };
      }

      // Generic SMS API call - will be customized based on your Bangladesh SMS provider
      const response = await axios.post(this.config.apiUrl, {
        to: phoneNumber,
        message: message,
        sender_id: this.config.senderId,
      }, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      return {
        success: true,
        messageId: (response.data as any)?.message_id || (response.data as any)?.id || `sms-${Date.now()}`,
      };

    } catch (error) {
      console.error('SMS sending failed:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        return {
          success: false,
          error: axiosError.response?.data?.message || axiosError.message || 'SMS API error',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMS error',
      };
    }
  }

  async sendOTP(phoneNumber: string, otp: string): Promise<SMSResponse> {
    const message = `Your 10 Minute School verification code is: ${otp}. This code will expire in 5 minutes. Do not share this code with anyone.`;
    return this.sendSMS(phoneNumber, message);
  }

  async sendBookingConfirmation(phoneNumber: string, bookingDetails: {
    date: string;
    time: string;
    teacher: string;
    branch: string;
  }): Promise<SMSResponse> {
    const message = `Booking confirmed! Date: ${bookingDetails.date}, Time: ${bookingDetails.time}, Teacher: ${bookingDetails.teacher}, Branch: ${bookingDetails.branch}. 10 Minute School`;
    return this.sendSMS(phoneNumber, message);
  }

  async sendBookingReminder(phoneNumber: string, bookingDetails: {
    date: string;
    time: string;
    teacher: string;
    branch: string;
  }): Promise<SMSResponse> {
    const message = `Reminder: Your speaking test is tomorrow at ${bookingDetails.time} with ${bookingDetails.teacher} at ${bookingDetails.branch}. 10 Minute School`;
    return this.sendSMS(phoneNumber, message);
  }

  async sendBookingCancellation(phoneNumber: string, bookingDetails: {
    date: string;
    time: string;
  }): Promise<SMSResponse> {
    const message = `Your booking for ${bookingDetails.date} at ${bookingDetails.time} has been cancelled. You can book a new slot anytime. 10 Minute School`;
    return this.sendSMS(phoneNumber, message);
  }

  // Method to test SMS service configuration
  async testConnection(): Promise<boolean> {
    try {
      if (process.env.NODE_ENV === 'development') {
        return true; // Always return true in development
      }

      // In production, you might want to send a test SMS or ping the API
      if (!this.config.apiUrl || !this.config.apiKey) {
        return false;
      }

      // Test API connectivity (customize based on your SMS provider)
      const response = await axios.get(`${this.config.apiUrl}/status`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        timeout: 5000,
      });

      return response.status === 200;
    } catch (error) {
      console.error('SMS service test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const smsService = new SMSService();
export default smsService;