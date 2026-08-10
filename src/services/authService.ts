
import { supabase } from '../lib/supabaseClient';
import { processReferral, generateReferralCode } from './supabaseService';
import { sendWelcomeEmail } from './emailService';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;

export const sendOtp = async (phone: string) => {
  try {
    // Generate a code (in a real app this would happen on the server, but for simplicity here)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // In production, we'd store this in a session or DB to verify later
    // For now, mirroring the existing signal flow
    
    const response = await fetch('/api/whatsapp/otp', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });

    const text = await response.text();
    let data: any = {};
    try { data = text && text.trim() ? JSON.parse(text) : {}; } catch {}

    if (!data.success) {
      console.error("[WhatsApp OTP] Error:", data.error);
      return { error: data.error };
    }

    console.log("[WhatsApp OTP] Sent:", data.messageId);
    return data;
  } catch (err: any) {
    console.error("[WhatsApp OTP] Critical Error:", err);
    return { error: err.message };
  }
};

export const sendOTP = sendOtp;

export const verifyOTP = async (phone: string, token: string) => {
  if (FUNCTIONS_URL) {
    const res = await fetch(`${FUNCTIONS_URL}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code: token }),
    });
    return res.json();
  }

  // Fallback
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms'
  });

  if (error) {
    console.error("[Auth] OTP Verify Error:", error.message);
    throw error;
  }

  return { success: true, session: data.session };
};

export const loginWithPhone = async (phone: string, code: string) => {
  const result = await verifyOTP(phone, code);

  if (!result.success) {
    throw new Error(result.error || "OTP verification failed");
  }

  // If using native auth
  return result.session;
};

export const loginWithUsername = async (username: string, password: string, persist: boolean = true) => {
  // First, find the email associated with this username
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('username', username)
    .single();

  if (profileError || !profile?.email) {
    // If not found by username, try interpreting username as email
    const { data, error } = await supabase.auth.signInWithPassword({
      email: username,
      password
    });
    
    if (error) {
      console.error("[Auth] Login Error:", error.message);
      throw error;
    }
    return data.session;
  }

  // Login with the found email
  const { data, error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password
  });

  if (error) {
    console.error("[Auth] Login Error:", error.message);
    throw error;
  }

  return data.session;
};

export const signUpWithUsername = async (username: string, email: string, password: string, fullName: string, phone: string, referralCode?: string) => {
  // 1. Check if username exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase().trim())
    .maybeSingle();

  if (existing) {
    throw new Error("Username already taken. Please choose another.");
  }

  // 2. Generate a unique referral code for the new user
  const myReferralCode = generateReferralCode(username);

  // 3. Sign up with Supabase
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username.toLowerCase().trim(),
        full_name: fullName || username,
        phone: phone,
        referral_code: myReferralCode,
        referred_by_code: referralCode || null
      }
    }
  });

  if (error) {
    console.error("[Auth] Signup Error:", error.message);
    throw error;
  }

  // 4. Post-signup processing (Referral linking and Welcome Email)
  if (data.user) {
    // Attempt to link referral if provided
    if (referralCode) {
      processReferral(data.user.id, referralCode).catch(err => 
        console.warn("[Auth] Referral processing deferred or failed:", err)
      );
    }

    // Send Welcome Email
    const referralLink = `${window.location.origin}/signup?ref=${myReferralCode}`;
    sendWelcomeEmail(email, fullName || username, referralLink).catch((err: any) => 
      console.warn("[Auth] Welcome email signal failed to broadcast:", err)
    );
  }

  return data.user;
};

export const loginWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("[Auth] Email Login Error:", error.message);
    throw error;
  }

  return data.session;
};

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    console.error("[Auth] Email Signup Error:", error.message);
    throw error;
  }

  return data.user;
};

export const loginWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
    }
  });

  if (error) {
    console.error("[Auth] Google Login Error:", error.message);
    throw error;
  }
};

export const sendMagicLink = async (email: string) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
    }
  });

  if (error) {
    console.error("[Auth] Magic Link Send Error:", error.message);
    throw error;
  }
  return true;
};

export const resetPasswordForEmail = async (email: string) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?type=recovery`,
  });

  if (error) {
    console.error("[Auth] Password Reset Error:", error.message);
    throw error;
  }
  return true;
};

export const updatePassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[Auth] Password Update Error:", error.message);
    throw error;
  }
  return true;
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[Auth] Logout Error:", error.message);
    throw error;
  }
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const syncProfile = async (user: any, attempts: number = 3): Promise<any> => {
  if (!user) return null;

  const PROFILE_SYNC_TIMEOUT = 35000; // Increased to 35s for high-latency environments

  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`[AuthService] PROFILE_SYNC_TIMEOUT | Query exceeded ${PROFILE_SYNC_TIMEOUT}ms for user ${user.id} (Attempt ${i + 1})`);
      controller.abort();
    }, PROFILE_SYNC_TIMEOUT);

    const startTime = Date.now();
    try {
      console.log(`[AuthService] Profile sync attempt ${i + 1}/${attempts} for ${user.id}`);
      
      if (!supabase) {
        throw new Error("Supabase client unreachable during sync");
      }

      // Simplified query to minimize overhead
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, username, avatar_url, subscription_status')
        .eq('id', user.id)
        .maybeSingle()
        .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      console.log(`[AuthService] Profile query completed in ${duration}ms for ${user.id}`);

      if (error) {
        console.error(`[AuthService] Query error for ${user.id}:`, error.message, error.code);
        throw error;
      }

      if (!profile) {
        console.log(`[AuthService] Profile missing for ${user.id}, initiating upsert...`);
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email || '',
            phone: user.user_metadata?.phone || user.phone || '',
            username: user.user_metadata?.username || user.user_metadata?.email?.split('@')[0] || `user_${user.id.substring(0, 5)}`,
            full_name: user.user_metadata?.full_name || 'User',
            phone_verified: !!(user.user_metadata?.phone_verified),
            role: user.email === 'pastornelsonezi@gmail.com' ? 'admin' : 'registered',
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })
          .select()
          .maybeSingle();

        if (createError) {
          console.error(`[AuthService] Profile upsert failed for ${user.id}:`, createError.message, createError.code);
          throw createError;
        }
        return newProfile;
      }
      
      return profile;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAborted = err.name === 'AbortError' || err.code === '20' || err.message?.includes('aborted');
      
      if (isAborted) {
        console.error(`[AuthService] PROFILE_SYNC_TIMEOUT | Query for ${user.id} was aborted after ${Date.now() - startTime}ms.`);
      } else {
        console.warn(`[AuthService] Attempt ${i + 1} failure for ${user.id}:`, err.message || err);
      }
      
      if (i < attempts - 1) {
        const delay = Math.pow(2, i) * 2000 + (isAborted ? 3000 : 0);
        console.log(`[AuthService] Retrying sync in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      console.error(`[AuthService] All ${attempts} profile sync attempts failed for ${user.id}. Returning fallback identity.`);
      
      return {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || 'User',
        role: 'registered',
        is_fallback: true,
        created_at: new Date().toISOString()
      };
    }
  }
  return null;
};
