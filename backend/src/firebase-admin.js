// Firebase Admin API for Cloudflare Workers using Service Account
// This provides admin-level access to Firestore

const FIREBASE_PROJECT_ID = 'atomstudy-2543';
const FIRESTORE_API = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const TOKEN_URI = 'https://oauth2.googleapis.com/token';
const SCOPES = 'https://www.googleapis.com/auth/datastore';

// Get access token using service account
async function getAccessToken(serviceAccountBase64) {
  try {
    // Decode base64 service account key
    const serviceAccountJson = atob(serviceAccountBase64);
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // Create JWT header
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id
    };
    
    // Create JWT claim set
    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      scope: SCOPES,
      aud: serviceAccount.token_uri || TOKEN_URI,
      iat: now,
      exp: now + 3600
    };
    
    // Encode JWT parts
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedClaimSet = btoa(JSON.stringify(claimSet)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // Create signature
    const signingInput = `${encodedHeader}.${encodedClaimSet}`;
    
    // Import private key
    const privateKey = serviceAccount.private_key;
    const privateKeyData = privateKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');
    
    const binaryKey = Uint8Array.from(atob(privateKeyData), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Sign the JWT
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signingInput)
    );
    
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    
    const jwt = `${signingInput}.${encodedSignature}`;
    
    // Exchange JWT for access token
    const tokenResponse = await fetch(serviceAccount.token_uri || TOKEN_URI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }
    
    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

// Cache for access token
let cachedToken = null;
let tokenExpiry = 0;

// Get cached or new access token
async function getCachedAccessToken(serviceAccountJson) {
  const now = Date.now();
  if (cachedToken && tokenExpiry > now + 60000) { // Refresh 1 min before expiry
    return cachedToken;
  }
  
  const token = await getAccessToken(serviceAccountJson);
  cachedToken = token;
  tokenExpiry = now + 3600000; // 1 hour
  return token;
}

// Helper to make Firestore REST API calls with admin access
async function firestoreRequest(path, method = 'GET', body = null, serviceAccountJson) {
  const accessToken = await getCachedAccessToken(serviceAccountJson);
  
  const url = `${FIRESTORE_API}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firestore API error: ${error}`);
  }

  return response.json();
}

// Convert Firestore document to plain object
function firestoreDocToObject(doc) {
  if (!doc.fields) return null;
  
  const obj = {};
  for (const [key, value] of Object.entries(doc.fields)) {
    if (value.stringValue !== undefined) obj[key] = value.stringValue;
    else if (value.integerValue !== undefined) obj[key] = parseInt(value.integerValue);
    else if (value.doubleValue !== undefined) obj[key] = value.doubleValue;
    else if (value.booleanValue !== undefined) obj[key] = value.booleanValue;
    else if (value.timestampValue !== undefined) obj[key] = value.timestampValue;
    else if (value.referenceValue !== undefined) obj[key] = value.referenceValue;
    else if (value.nullValue !== undefined) obj[key] = null;
    else if (value.arrayValue !== undefined) {
      obj[key] = value.arrayValue.values?.map(v => {
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.integerValue !== undefined) return parseInt(v.integerValue);
        if (v.doubleValue !== undefined) return v.doubleValue;
        if (v.booleanValue !== undefined) return v.booleanValue;
        return v;
      }) || [];
    }
    else if (value.mapValue !== undefined) {
      obj[key] = firestoreDocToObject({ fields: value.mapValue.fields });
    }
  }
  
  // Add document ID
  if (doc.name) {
    const parts = doc.name.split('/');
    obj.id = parts[parts.length - 1];
  }
  
  // Add createTime and updateTime if available
  if (doc.createTime) obj._createTime = doc.createTime;
  if (doc.updateTime) obj._updateTime = doc.updateTime;
  
  return obj;
}

// Convert plain object to Firestore format
function objectToFirestoreDoc(obj) {
  const fields = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    
    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: value.toString() };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map(v => {
            if (typeof v === 'string') return { stringValue: v };
            if (typeof v === 'number') return { integerValue: v.toString() };
            return v;
          })
        }
      };
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: { fields: objectToFirestoreDoc(value).fields } };
    }
  }
  
  return { fields };
}

// Get all users with normalized data
export async function getUsers(serviceAccountJson) {
  try {
    const response = await firestoreRequest('/users', 'GET', null, serviceAccountJson);
    
    if (!response.documents) {
      return [];
    }
    
    return response.documents.map(doc => {
      const user = firestoreDocToObject(doc);
      const plan = user.plan || user.subscription || 'starter';
      
      // Normalize user fields
      return {
        id: user.id,
        // Profile
        name: user.name || user.displayName || user.fullName || user.display_name || null,
        email: user.email || user.mail || user.e_mail || user.user_email || null,
        photoURL: user.photoURL || user.photoUrl || user.avatar || user.photo_url || null,
        
        // Education
        educationLevel: user.educationLevel || user.education_level || user.education || null,
        grade: user.grade || user.class || user.sinif || null,
        department: user.department || user.bolum || user.major || null,
        school: user.school || user.okul || user.university || user.high_school || null,
        
        // Plan
        plan: plan,
        isPremium: user.isPremium || user.is_premium || plan === 'premium' || plan === 'pro' || false,
        
        // Usage
        role: user.role || user.user_role || 'user',
        used_quota: user.used_quota || user.usedQuota || user.quota_used || 0,
        quota_limit: user.quota_limit || user.quotaLimit || user.max_quota || 10,
        last_usage_date: user.last_usage_date || user.lastUsageDate || user.last_active || null,
        
        // Timestamps
        createdAt: user.createdAt || user.created_at || user._createTime || null,
        updatedAt: user.updatedAt || user.updated_at || user._updateTime || null,
        
        // Raw data for debugging
        _raw: user,
      };
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

// Get user by ID with normalized data
export async function getUserById(userId, serviceAccountJson) {
  try {
    const response = await firestoreRequest(`/users/${userId}`, 'GET', null, serviceAccountJson);
    const user = firestoreDocToObject(response);
    if (!user) return null;
    
    // Normalize user fields - check all possible field names
    const plan = user.plan || user.subscription || 'starter';
    
    return {
      id: user.id,
      // Profile fields
      name: user.name || user.displayName || user.fullName || user.display_name || null,
      email: user.email || user.mail || user.e_mail || user.user_email || null,
      photoURL: user.photoURL || user.photoUrl || user.avatar || user.photo_url || null,
      
      // Education fields
      educationLevel: user.educationLevel || user.education_level || user.education || null, // 'Lise', 'Üniversite', 'Ortaokul'
      grade: user.grade || user.class || user.sinif || null, // '11', '2', '8'
      department: user.department || user.bolum || user.major || null, // 'Yazılım Mühendisliği', 'Sayısal'
      school: user.school || user.okul || user.university || user.high_school || null,
      
      // Plan fields
      plan: plan,
      subscription: plan,
      isPremium: user.isPremium || user.is_premium || plan === 'premium' || plan === 'pro' || false,
      
      // Role and permissions
      role: user.role || user.user_role || 'user',
      used_quota: user.used_quota || user.usedQuota || user.quota_used || 0,
      quota_limit: user.quota_limit || user.quotaLimit || user.max_quota || 10,
      last_usage_date: user.last_usage_date || user.lastUsageDate || user.last_active || null,
      
      // Timestamps
      createdAt: user.createdAt || user.created_at || user._createTime || null,
      updatedAt: user.updatedAt || user.updated_at || user._updateTime || null,
      
      // Additional fields
      phoneNumber: user.phoneNumber || user.phone || user.phone_number || null,
      provider: user.provider || user.signInProvider || user.auth_provider || 'google',
      emailVerified: user.emailVerified || user.email_verified || false,
      disabled: user.disabled || user.is_disabled || false,
      
      // Raw data for debugging
      _raw: user,
    };
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

// Get user's questions/logs
export async function getUserLogs(userId, serviceAccountJson) {
  try {
    const response = await firestoreRequest(`/users/${userId}/logs`, 'GET', null, serviceAccountJson);
    
    if (!response.documents) {
      return [];
    }
    
    return response.documents.map(doc => firestoreDocToObject(doc));
  } catch (error) {
    console.error('Error getting user logs:', error);
    return [];
  }
}

// Get specific question by ID (searches all users)
export async function getQuestionById(questionId, serviceAccountJson) {
  try {
    // First get all users
    const users = await getUsers(serviceAccountJson);
    
    // Search in each user's logs
    for (const user of users) {
      try {
        const response = await firestoreRequest(`/users/${user.id}/logs/${questionId}`, 'GET', null, serviceAccountJson);
        if (response && response.fields) {
          const question = firestoreDocToObject(response);
          return {
            ...question,
            userId: user.id,
            user_name: user.name || user.email,
            user_email: user.email,
          };
        }
      } catch (err) {
        // Question not in this user, continue
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting question by ID:', error);
    return null;
  }
}

// Get all questions from all users
export async function getAllQuestions(serviceAccountJson) {
  try {
    const users = await getUsers(serviceAccountJson);
    const allQuestions = [];
    
    // Get questions for each user
    for (const user of users) {
      try {
        const logs = await getUserLogs(user.id, serviceAccountJson);
        logs.forEach(log => {
          allQuestions.push({
            ...log,
            userId: user.id,
            user_name: user.name || user.email,
            user_email: user.email,
            // Normalize field names
            subject: log.subject || log.ders || 'Matematik',
            topic: log.topic || log.konu || '',
            model_used: log.model || log.model_used || 'gemini-2.5-pro',
            status: log.error ? 'error' : 'success',
            response_time_ms: log.responseTime || log.response_time_ms || 2000,
            cost_usd: log.cost || log.cost_usd || 0.015,
            created_at: log.timestamp || log.createdAt || new Date().toISOString(),
          });
        });
      } catch (err) {
        console.error(`Error getting logs for user ${user.id}:`, err);
        // Continue with other users
      }
    }
    
    // Sort by timestamp (newest first)
    allQuestions.sort((a, b) => {
      const timeA = new Date(a.created_at || 0);
      const timeB = new Date(b.created_at || 0);
      return timeB - timeA;
    });
    
    return allQuestions;
  } catch (error) {
    console.error('Error getting all questions:', error);
    return [];
  }
}

// Save question log
export async function saveQuestionLog(userId, logData, serviceAccountJson) {
  try {
    const doc = objectToFirestoreDoc({
      ...logData,
      timestamp: new Date().toISOString(),
    });
    
    const response = await firestoreRequest(
      `/users/${userId}/logs`,
      'POST',
      doc,
      serviceAccountJson
    );
    
    return firestoreDocToObject(response);
  } catch (error) {
    console.error('Error saving question log:', error);
    throw error;
  }
}

// Create new user
export async function createUser(userId, userData, serviceAccountJson) {
  try {
    const doc = objectToFirestoreDoc(userData);
    
    const response = await firestoreRequest(
      `/users/${userId}`,
      'PATCH',
      doc,
      serviceAccountJson
    );
    
    return firestoreDocToObject(response);
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// Delete user
export async function deleteUser(userId, serviceAccountJson) {
  try {
    const accessToken = await getCachedAccessToken(serviceAccountJson);
    
    const url = `${FIRESTORE_API}/users/${userId}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firestore delete error: ${errorText}`);
    }
    
    return { success: true, id: userId };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

// Update user - updates only specified fields
export async function updateUser(userId, userData, serviceAccountJson) {
  try {
    // First, get the current document
    const currentDoc = await firestoreRequest(`/users/${userId}`, 'GET', null, serviceAccountJson);
    
    if (!currentDoc || !currentDoc.fields) {
      throw new Error('User not found');
    }
    
    // Merge the new data with the current document
    const mergedFields = { ...currentDoc.fields };
    
    for (const [key, value] of Object.entries(userData)) {
      if (key.startsWith('_')) continue; // Skip internal fields
      
      // Convert value to Firestore format
      if (value === null || value === undefined) {
        continue; // Skip null/undefined values
      } else if (typeof value === 'string') {
        mergedFields[key] = { stringValue: value };
      } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          mergedFields[key] = { integerValue: value.toString() };
        } else {
          mergedFields[key] = { doubleValue: value };
        }
      } else if (typeof value === 'boolean') {
        mergedFields[key] = { booleanValue: value };
      } else if (typeof value === 'object' && !(value instanceof Array)) {
        // For nested objects, we'd need recursive conversion, but for now skip
        continue;
      }
    }
    
    // Update the timestamp
    mergedFields['updatedAt'] = { timestampValue: new Date().toISOString() };
    
    // Write the merged document back
    const doc = { fields: mergedFields };
    
    const response = await firestoreRequest(
      `/users/${userId}`,
      'PATCH',
      doc,
      serviceAccountJson
    );
    
    return firestoreDocToObject(response);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

// Get stats
export async function getStats(serviceAccountJson) {
  try {
    const users = await getUsers(serviceAccountJson);
    const allQuestions = await getAllQuestions(serviceAccountJson);
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Calculate stats
    const totalUsers = users.length;
    const premiumUsers = users.filter(u => u.subscription === 'Premium' || u.isPremium).length;
    const newUsersThisMonth = users.filter(u => {
      const created = new Date(u.createdAt || u.timestamp || 0);
      return created >= thisMonth;
    }).length;
    
    const activeUsers = new Set(
      allQuestions
        .filter(q => new Date(q.created_at || 0) >= last7Days)
        .map(q => q.userId)
    ).size;
    
    const totalQuestions = allQuestions.length;
    const successfulQuestions = allQuestions.filter(q => q.status === 'success').length;
    const failedQuestions = totalQuestions - successfulQuestions;
    
    const todayQuestions = allQuestions.filter(q => {
      const qDate = new Date(q.created_at || 0);
      return qDate >= today;
    }).length;
    
    // Calculate average response time
    const questionsWithTime = allQuestions.filter(q => q.response_time_ms);
    const avgTime = questionsWithTime.length > 0
      ? questionsWithTime.reduce((sum, q) => sum + (q.response_time_ms || 0), 0) / questionsWithTime.length
      : 0;
    
    // Calculate total cost
    const totalCost = allQuestions.reduce((sum, q) => sum + (q.cost_usd || 0), 0);
    
    return {
      totalUsers,
      activeUsers,
      premiumUsers,
      newUsersThisMonth,
      totalQuestions,
      successfulQuestions,
      failedQuestions,
      successRate: totalQuestions > 0 ? ((successfulQuestions / totalQuestions) * 100).toFixed(1) : '0',
      avgResponseTime: `${(avgTime / 1000).toFixed(1)}s`,
      totalCost: `$${totalCost.toFixed(2)}`,
      todayQuestions,
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    // Return default stats instead of throwing
    return {
      totalUsers: 0,
      activeUsers: 0,
      premiumUsers: 0,
      newUsersThisMonth: 0,
      totalQuestions: 0,
      successfulQuestions: 0,
      failedQuestions: 0,
      successRate: '0',
      avgResponseTime: '0s',
      totalCost: '$0.00',
      todayQuestions: 0,
    };
  }
}
