interface OTPData {
  otp: string;
  phoneNumber: string;
  expiresAt: Date;
  attempts: number;
}

class OTPService {
  private otpStore: Map<string, OTPData> = new Map();
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly MAX_ATTEMPTS = 3;
  private readonly OTP_LENGTH = 6;

  constructor() {
    // Clean up expired OTPs every minute
    setInterval(() => {
      this.cleanupExpiredOTPs();
    }, 60000);
  }

  generateOTP(): string {
    // Generate 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async storeOTP(phoneNumber: string, otp: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    this.otpStore.set(phoneNumber, {
      otp,
      phoneNumber,
      expiresAt,
      attempts: 0,
    });

    console.log(`📱 OTP stored for ${phoneNumber}: ${otp} (expires at ${expiresAt.toISOString()})`);
  }

  async verifyOTP(phoneNumber: string, providedOTP: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const otpData = this.otpStore.get(phoneNumber);

    if (!otpData) {
      return {
        success: false,
        error: 'No OTP found for this phone number. Please request a new OTP.',
      };
    }

    // Check if OTP has expired
    if (new Date() > otpData.expiresAt) {
      this.otpStore.delete(phoneNumber);
      return {
        success: false,
        error: 'OTP has expired. Please request a new OTP.',
      };
    }

    // Check if max attempts exceeded
    if (otpData.attempts >= this.MAX_ATTEMPTS) {
      this.otpStore.delete(phoneNumber);
      return {
        success: false,
        error: 'Maximum verification attempts exceeded. Please request a new OTP.',
      };
    }

    // Increment attempts
    otpData.attempts++;

    // Verify OTP
    if (otpData.otp !== providedOTP) {
      return {
        success: false,
        error: `Invalid OTP. ${this.MAX_ATTEMPTS - otpData.attempts} attempts remaining.`,
      };
    }

    // OTP is valid, remove it from store
    this.otpStore.delete(phoneNumber);
    
    console.log(`✅ OTP verified successfully for ${phoneNumber}`);
    
    return {
      success: true,
    };
  }

  async hasValidOTP(phoneNumber: string): Promise<boolean> {
    const otpData = this.otpStore.get(phoneNumber);
    
    if (!otpData) {
      return false;
    }

    // Check if expired
    if (new Date() > otpData.expiresAt) {
      this.otpStore.delete(phoneNumber);
      return false;
    }

    return true;
  }

  async getRemainingTime(phoneNumber: string): Promise<number> {
    const otpData = this.otpStore.get(phoneNumber);
    
    if (!otpData) {
      return 0;
    }

    const now = new Date();
    const remaining = Math.max(0, Math.floor((otpData.expiresAt.getTime() - now.getTime()) / 1000));
    
    return remaining;
  }

  async deleteOTP(phoneNumber: string): Promise<void> {
    this.otpStore.delete(phoneNumber);
  }

  private cleanupExpiredOTPs(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [phoneNumber, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(phoneNumber);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired OTPs`);
    }
  }

  // Get statistics for monitoring
  getStats(): {
    totalOTPs: number;
    expiredOTPs: number;
    validOTPs: number;
  } {
    const now = new Date();
    let expiredCount = 0;
    let validCount = 0;

    for (const otpData of this.otpStore.values()) {
      if (now > otpData.expiresAt) {
        expiredCount++;
      } else {
        validCount++;
      }
    }

    return {
      totalOTPs: this.otpStore.size,
      expiredOTPs: expiredCount,
      validOTPs: validCount,
    };
  }

  // For development/testing - get OTP without verification
  async getOTPForTesting(phoneNumber: string): Promise<string | null> {
    if (process.env.NODE_ENV !== 'development') {
      return null;
    }

    const otpData = this.otpStore.get(phoneNumber);
    return otpData?.otp || null;
  }
}

// Export singleton instance
export const otpService = new OTPService();
export default otpService;