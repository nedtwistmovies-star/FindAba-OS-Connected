
/**
 * WhatsApp Cloud API Service (FindAba Integration)
 * Implementation for Meta Cloud API v23.0
 */

interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
  fallbackUsed?: boolean;
}

const API_VERSION = 'v23.0';

/**
 * Standardized logging for traceability
 */
const log = (type: string, data: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${type}:`, JSON.stringify(data, null, 2));
};

/**
 * Fetch with dynamic retry + single-read body handling
 */
async function fetchWithRetry(
  url: string, 
  options: any, 
  retries = 3, 
  backoff = 1000
): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    let parsedBody = {};
    try { parsedBody = options.body ? JSON.parse(options.body) : {}; } catch {}
    log('WHATSAPP_REQUEST_SENT', { url, method: options.method, body: parsedBody });
    const response = await fetch(url, options);
    
    // Read the body exactly once
    let responseData: any;
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = { rawText: 'Failed to parse JSON response' };
    }

    if (response.ok) {
      return { ok: true, status: response.status, data: responseData };
    }

    // If it's a transient failure, we can retry, otherwise fail fast on OAuthExceptions
    const isOAuthError = responseData?.error?.type === 'OAuthException';
    if (!isOAuthError && retries > 0) {
      log('WHATSAPP_RETRY_SIGNAL', { status: response.status, retriesLeft: retries, error: responseData });
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    
    return { ok: false, status: response.status, data: responseData };
  } catch (err: any) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    return { ok: false, status: 500, data: { error: { message: err.message || 'Network error' } } };
  }
}

/**
 * Core execution engine with lazy credential loading
 */
async function executeMetaRequest(payload: any): Promise<WhatsAppResponse> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    const errorMsg = 'Missing Meta Cloud API credentials (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID) in environment variables.';
    log('WHATSAPP_ERROR', errorMsg);
    return { 
      success: false, 
      error: 'CREDENTIALS_MISSING',
      details: 'Configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in your App Settings / `.env` file.'
    };
  }

  const baseUrl = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;

  try {
    const result = await fetchWithRetry(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    log('WHATSAPP_RESPONSE_RECEIVED', result.data);

    if (result.ok) {
      return {
        success: true,
        messageId: result.data.messages?.[0]?.id,
        details: result.data
      };
    } else {
      const errorObj = result.data?.error || {};
      let diagnosticHint = '';
      
      if (errorObj.type === 'OAuthException') {
        diagnosticHint = 'This usually indicates an expired/invalid token, incorrect App/Business ID setup, or missing permissions (e.g. whatsapp_business_messaging). ';
        if (errorObj.error_subcode === 2334002) {
          diagnosticHint += 'Verify the target phone number is registered or is added to your test accounts list if in Developer/Sandbox.';
        } else if (errorObj.code === 100) {
          diagnosticHint += 'Check if the templates exist and are fully approved in your Meta App Dashboard.';
        }
      }

      return {
        success: false,
        error: errorObj.message || 'UNKNOWN_META_ERROR',
        details: {
          ...result.data,
          diagnosticHint: diagnosticHint.trim()
        }
      };
    }
  } catch (err: any) {
    log('WHATSAPP_ERROR', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Clean phone number to E.164-ish format (digits only)
 */
const formatPhone = (phone: string) => phone.replace(/\D/g, '');

// --- PUBLIC API ---

export const sendTemplateMessage = async (to: string, templateName: string, languageCode = 'en_US', components: any[] = []) => {
  const payload = {
    messaging_product: 'whatsapp',
    to: formatPhone(to),
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length > 0 ? { components } : {}),
    },
  };
  return executeMetaRequest(payload);
};

export const sendTextMessage = async (to: string, text: string) => {
  const payload = {
    messaging_product: 'whatsapp',
    to: formatPhone(to),
    type: 'text',
    text: { body: text },
  };
  return executeMetaRequest(payload);
};

/**
 * Enhanced execution engine with automatic fallback for missing templates.
 */
export const sendTemplateWithFallback = async (
  to: string, 
  templateName: string, 
  fallbackText: string,
  languageCode = 'en_US', 
  components: any[] = []
): Promise<WhatsAppResponse> => {
  const result = await sendTemplateMessage(to, templateName, languageCode, components);
  
  // Error 132001: Template name does not exist in the translation
  if (!result.success && (result.details?.error?.code === 132001 || result.details?.error?.error_subcode === 2494001)) {
    log('WHATSAPP_FALLBACK_TRIGGERED', { reason: 'Template not found', templateName });
    const fallbackResult = await sendTextMessage(to, fallbackText);
    return {
      ...fallbackResult,
      fallbackUsed: true
    };
  }
  
  return result;
};

export const sendHelloWorld = async (to: string) => {
  return sendTemplateMessage(to, 'hello_world', 'en_US');
};

/**
 * Standard Flow: OTP Verification
 */
export const sendOTPMessage = async (to: string, code: string) => {
  const fallback = `FindAba Login Code: ${code}. Please do not share this code with anyone.`;
  return sendTemplateWithFallback(to, 'otp_verification', fallback, 'en_US', [
    {
      type: 'body',
      parameters: [{ type: 'text', text: code }],
    },
    {
      type: 'button',
      sub_type: 'url',
      index: 0,
      parameters: [{ type: 'text', text: code }],
    }
  ]);
};

/**
 * Standard Flow: Welcome Message
 */
export const sendWelcomeMessage = async (to: string, userName: string) => {
  const fallback = `Welcome to FindAba, ${userName}! You're now part of the FindAba community. Start exploring at findaba.com.ng`;
  return sendTemplateWithFallback(to, 'welcome_onboarding', fallback, 'en_US', [
    {
      type: 'body',
      parameters: [{ type: 'text', text: userName }],
    },
  ]);
};

/**
 * Standard Flow: Business Inquiry
 */
export const sendBusinessInquiryMessage = async (to: string, businessName: string, message: string, inquirerName: string) => {
  const fallback = `*Message from FindAba*\n\nBusiness: ${businessName}\nFrom: ${inquirerName}\n\nMessage: ${message}`;
  return sendTemplateWithFallback(to, 'business_inquiry_alert', fallback, 'en_US', [
    {
      type: 'header',
      parameters: [{ type: 'text', text: businessName }],
    },
    {
      type: 'body',
      parameters: [
        { type: 'text', text: inquirerName },
        { type: 'text', text: message }
      ],
    },
  ]);
};
