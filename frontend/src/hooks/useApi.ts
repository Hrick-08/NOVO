import { BASE_URL } from '../config';

export interface User {
  user_id?: number;
  id: number;
  name: string;
  email: string;
  created_at?: string;
}

export interface Payment {
  txn_ref: string;
  merchant_name: string;
  merchant_upi: string;
  amount: number;
  status: string;
  created_at: string;
}

export interface MonthlySummary {
  total_spent_this_month: number;
  recent_merchants: { merchant_name: string; merchant_upi: string; last_used: string }[];
}

async function getHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  return headers;
}

export async function register(name: string, email: string): Promise<User> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Registration failed');
    }
    return response.json();
  } catch (error: any) {
    console.error('Register error:', error);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Check your network connection.');
    }
    throw new Error(error.message || 'Failed to connect to server');
  }
}

export async function getCurrentUser(userId: number): Promise<User> {
  const response = await fetch(`${BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      ...(await getHeaders()),
      'X-User-Id': userId.toString(),
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get user');
  }
  return response.json();
}

export async function logPayment(
  txnRef: string,
  pa: string,
  pn: string,
  amount: number,
  userId: number
): Promise<{ message: string; txn_ref: string }> {
  const response = await fetch(`${BASE_URL}/payments/log`, {
    method: 'POST',
    headers: {
      ...(await getHeaders()),
      'X-User-Id': userId.toString(),
    },
    body: JSON.stringify({
      txn_ref: txnRef,
      pa,
      pn,
      amount,
      status: 'pending',
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to log payment');
  }
  return response.json();
}

export async function verifyPayment(
  txnRef: string,
  txnId: string,
  userId: number
): Promise<{ verified: boolean }> {
  const response = await fetch(`${BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: {
      ...(await getHeaders()),
      'X-User-Id': userId.toString(),
    },
    body: JSON.stringify({ txn_ref: txnRef, txn_id: txnId }),
  });
  if (!response.ok) {
    throw new Error('Failed to verify payment');
  }
  return response.json();
}

export async function updatePaymentStatus(
  txnRef: string,
  status: string,
  userId: number
): Promise<{ status: string }> {
  const response = await fetch(`${BASE_URL}/payments/status/${txnRef}`, {
    method: 'PATCH',
    headers: {
      ...(await getHeaders()),
      'X-User-Id': userId.toString(),
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error('Failed to update payment status');
  }
  return response.json();
}

export async function getPaymentStatus(
  txnRef: string,
  userId: number
): Promise<{ status: string }> {
  const response = await fetch(`${BASE_URL}/payments/status/${txnRef}`, {
    method: 'GET',
    headers: {
      ...(await getHeaders()),
      'X-User-Id': userId.toString(),
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get payment status');
  }
  return response.json();
}

export async function getPaymentHistory(userId: number): Promise<Payment[]> {
  const response = await fetch(`${BASE_URL}/payments/history`, {
    method: 'GET',
    headers: {
      ...(await getHeaders()),
      'X-User-Id': userId.toString(),
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get payment history');
  }
  return response.json();
}

export async function getMonthlySummary(userId: number): Promise<MonthlySummary> {
  const response = await fetch(`${BASE_URL}/payments/summary`, {
    method: 'GET',
    headers: {
      ...(await getHeaders()),
      'X-User-Id': userId.toString(),
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get monthly summary');
  }
  return response.json();
}

// export async function parseQRCode(imageUri: string): Promise<{
//   pa: string;
//   pn: string;
//   am: string;
//   tn: string;
// }> {
//   const formData = new FormData();
//   const extension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
//   const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
  
//   formData.append('file', {
//     uri: imageUri,
//     type: mimeType,
//     name: `qr.${extension}`,
//   } as any);

//   const response = await fetch(`${BASE_URL}/qr/parse`, {
//     method: 'POST',
//     body: formData,
//   });
  
//   if (!response.ok) {
//     const errorText = await response.text();
//     throw new Error(errorText || 'Failed to parse QR code');
//   }
//   return response.json();
// }