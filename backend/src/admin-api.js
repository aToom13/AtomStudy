// Admin API Routes
import * as firebase from './firebase-admin.js';

export async function handleAdminRequest(request, env, pathname) {
  // TODO: Restrict to specific origins in production
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Firebase-Api-Key',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check admin authentication
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const token = authHeader.substring(7);
  if (token !== env.ADMIN_SECRET) {
    return jsonResponse({ error: 'Invalid token' }, 403, corsHeaders);
  }

  // Route handling - ORDER MATTERS! More specific routes first
  if (pathname === '/api/admin/stats') {
    return handleGetStats(env, corsHeaders);
  } else if (pathname === '/api/admin/questions') {
    return handleGetQuestions(request, env, corsHeaders);
  } else if (pathname === '/api/admin/models') {
    return handleGetModels(request, env, corsHeaders);
  } else if (pathname.startsWith('/api/admin/models/')) {
    const modelId = pathname.split('/')[4];
    return handleUpdateModel(request, env, modelId, corsHeaders);
  } else if (pathname === '/api/admin/settings') {
    return handleSettings(request, env, corsHeaders);
  } else if (pathname === '/api/admin/analytics') {
    return handleAnalytics(request, env, corsHeaders);
  } else if (pathname === '/api/admin/config') {
    return handleConfig(request, env, corsHeaders);
  } else if (pathname === '/api/admin/demo-user') {
    return handleCreateDemoUser(request, env, corsHeaders);
  } else if (pathname.startsWith('/api/admin/questions/')) {
    const questionId = pathname.split('/')[4];
    return handleQuestionDetail(request, env, questionId, corsHeaders);
  } else if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/subscription')) {
    const userId = pathname.split('/')[4];
    return handleUserSubscription(request, env, userId, corsHeaders);
  } else if (pathname.match(/^\/api\/admin\/users\/[^\/]+$/) && !pathname.endsWith('/subscription')) {
    // Handle /api/admin/users/{userId} - PUT, DELETE, GET
    const userId = pathname.split('/')[4];
    if (request.method === 'DELETE') {
      return handleDeleteUser(request, env, userId, corsHeaders);
    } else if (request.method === 'PUT') {
      return handleUpdateUser(request, env, userId, corsHeaders);
    } else {
      return handleUserDetail(request, env, userId, corsHeaders);
    }
  } else if (pathname === '/api/admin/users') {
    // Handle /api/admin/users - GET (list) or POST (create)
    if (request.method === 'POST') {
      return handleCreateUser(request, env, corsHeaders);
    } else {
      return handleGetUsers(request, env, corsHeaders);
    }
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

// Get Dashboard Stats
async function handleGetStats(env, corsHeaders) {
  try {
    const stats = await firebase.getStats(env.FIREBASE_SERVICE_ACCOUNT);
    return jsonResponse(stats, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Get Users List
async function handleGetUsers(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';

    let users = await firebase.getUsers(env.FIREBASE_SERVICE_ACCOUNT);
    
    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(u => 
        (u.name && u.name.toLowerCase().includes(searchLower)) ||
        (u.email && u.email.toLowerCase().includes(searchLower))
      );
    }
    
    const total = users.length;
    const offset = (page - 1) * limit;
    const paginatedUsers = users.slice(offset, offset + limit);

    return jsonResponse({
      users: paginatedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Get User Detail
async function handleUserDetail(request, env, userId, corsHeaders) {
  try {
    if (request.method === 'GET') {
      const user = await firebase.getUserById(userId, env.FIREBASE_SERVICE_ACCOUNT);
      
      if (!user) {
        return jsonResponse({ error: 'User not found' }, 404, corsHeaders);
      }

      // Get user's questions
      const questions = await firebase.getUserLogs(userId, env.FIREBASE_SERVICE_ACCOUNT);

      return jsonResponse({
        user,
        recentQuestions: questions.slice(0, 10),
      }, 200, corsHeaders);
    } else if (request.method === 'PUT') {
      const data = await request.json();
      const user = await firebase.updateUser(userId, data, env.FIREBASE_SERVICE_ACCOUNT);
      return jsonResponse(user, 200, corsHeaders);
    } else if (request.method === 'DELETE') {
      // Firebase delete would need Admin SDK or different approach
      return jsonResponse({ error: 'Delete not implemented yet' }, 501, corsHeaders);
    }
  } catch (error) {
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Get Questions List
async function handleGetQuestions(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const subject = url.searchParams.get('subject');
    const status = url.searchParams.get('status');
    const model = url.searchParams.get('model');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let questions = await firebase.getAllQuestions(env.FIREBASE_SERVICE_ACCOUNT);
    
    // Filter
    if (subject && subject !== 'all') {
      questions = questions.filter(q => q.subject === subject);
    }
    
    if (status && status !== 'all') {
      questions = questions.filter(q => {
        if (status === 'success') return !q.error && q.status !== 'error';
        if (status === 'error') return q.error || q.status === 'error';
        return true;
      });
    }
    
    if (model && model !== 'all') {
      questions = questions.filter(q => q.model === model || q.model_used === model);
    }
    
    // Paginate
    const offset = (page - 1) * limit;
    const paginatedQuestions = questions.slice(offset, offset + limit);

    return jsonResponse({
      questions: paginatedQuestions,
      page,
      limit,
      total: questions.length,
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Get AI Models
async function handleGetModels(request, env, corsHeaders) {
  try {
    // Since we don't store models in Firebase, return default models with calculated stats
    const questions = await firebase.getAllQuestions(env.FIREBASE_SERVICE_ACCOUNT);
    
    const models = [
      { id: 1, name: 'gemini-3-pro-preview', provider: 'Google', status: 'active', priority: 1, input_cost_per_1k: 0.0025, output_cost_per_1k: 0.010, description: 'En gelişmiş model, karmaşık sorular için' },
      { id: 2, name: 'gemini-2.5-pro', provider: 'Google', status: 'active', priority: 2, input_cost_per_1k: 0.0015, output_cost_per_1k: 0.006, description: 'Dengeli performans ve maliyet' },
      { id: 3, name: 'gemini-2.5-flash', provider: 'Google', status: 'active', priority: 3, input_cost_per_1k: 0.0005, output_cost_per_1k: 0.002, description: 'Hızlı ve ekonomik' },
      { id: 4, name: 'gemini-1.5-flash', provider: 'Google', status: 'backup', priority: 4, input_cost_per_1k: 0.0003, output_cost_per_1k: 0.001, description: 'Yedek model' },
    ];
    
    // Calculate stats for each model
    const modelsWithStats = models.map(model => {
      const modelQuestions = questions.filter(q => 
        q.model_used && q.model_used.includes(model.name.split('-')[1])
      );
      
      const totalUsage = modelQuestions.length;
      const successCount = modelQuestions.filter(q => q.status === 'success').length;
      const errorCount = totalUsage - successCount;
      const totalCost = modelQuestions.reduce((sum, q) => sum + (q.cost_usd || 0), 0);
      const avgTime = totalUsage > 0
        ? modelQuestions.reduce((sum, q) => sum + (q.response_time_ms || 0), 0) / totalUsage
        : 0;
      
      return {
        ...model,
        total_usage_count: totalUsage,
        success_count: successCount,
        error_count: errorCount,
        total_cost_usd: totalCost,
        avg_response_time_ms: Math.round(avgTime),
      };
    });
    
    return jsonResponse(modelsWithStats, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Update AI Model
async function handleUpdateModel(request, env, modelId, corsHeaders) {
  try {
    if (request.method !== 'PUT') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    const data = await request.json();
    const db = env.DB;

    await db.prepare(
      `UPDATE ai_models SET 
       status = ?, priority = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(data.status, data.priority, modelId).run();

    const model = await db.prepare('SELECT * FROM ai_models WHERE id = ?').bind(modelId).first();
    return jsonResponse(model, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Settings
async function handleSettings(request, env, corsHeaders) {
  try {
    const db = env.DB;

    if (request.method === 'GET') {
      const settings = await db.prepare('SELECT * FROM system_settings').all();
      const settingsObj = {};
      for (const setting of settings.results || []) {
        settingsObj[setting.key] = setting.value;
      }
      return jsonResponse(settingsObj, 200, corsHeaders);
    } else if (request.method === 'PUT') {
      const data = await request.json();
      
      for (const [key, value] of Object.entries(data)) {
        await db.prepare(
          `INSERT INTO system_settings (key, value, updated_at) 
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`
        ).bind(key, value, value).run();
      }

      return jsonResponse({ success: true }, 200, corsHeaders);
    }
  } catch (error) {
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Analytics
async function handleAnalytics(request, env, corsHeaders) {
  try {
    const db = env.DB;
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');

    const analytics = await db.prepare(
      `SELECT * FROM daily_analytics 
       WHERE date >= date('now', '-${days} days')
       ORDER BY date DESC`
    ).all();

    return jsonResponse(analytics.results || [], 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Get Question Detail
async function handleQuestionDetail(request, env, questionId, corsHeaders) {
  try {
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    const question = await firebase.getQuestionById(questionId, env.FIREBASE_SERVICE_ACCOUNT);
    
    if (!question) {
      return jsonResponse({ error: 'Question not found' }, 404, corsHeaders);
    }

    // Get user info
    const user = await firebase.getUserById(question.userId, env.FIREBASE_SERVICE_ACCOUNT);
    
    return jsonResponse({
      question,
      user: user || null,
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Plan definitions with daily credits
const PLAN_CONFIG = {
  'Başlangıç': { credits: 3, isPremium: false },
  'Temel': { credits: 5, isPremium: false },
  'Standart': { credits: 10, isPremium: false },
  'Premium': { credits: 30, isPremium: true },
};

// Get plan credits
function getPlanCredits(planName) {
  return PLAN_CONFIG[planName]?.credits || 3;
}

// Check if plan is premium
function isPremiumPlan(planName) {
  return PLAN_CONFIG[planName]?.isPremium || false;
}

// Handle User Subscription
async function handleUserSubscription(request, env, userId, corsHeaders) {
  try {
    if (request.method === 'GET') {
      const user = await firebase.getUserById(userId, env.FIREBASE_SERVICE_ACCOUNT);
      if (!user) {
        return jsonResponse({ error: 'User not found' }, 404, corsHeaders);
      }
      
      // Normalize plan name - map old names to new ones
      let plan = user.plan || 'Başlangıç';
      if (plan === 'starter' || plan === 'free') plan = 'Başlangıç';
      if (plan === 'basic') plan = 'Temel';
      if (plan === 'standard') plan = 'Standart';
      
      return jsonResponse({
        userId,
        plan: plan,
        subscription: user.subscription || plan,
        isPremium: user.isPremium || isPremiumPlan(plan),
        dailyCredits: getPlanCredits(plan),
        used_quota: user.used_quota || 0,
      }, 200, corsHeaders);
    } else if (request.method === 'PUT') {
      const data = await request.json();
      
      // Get current user data first to preserve other fields
      const currentUser = await firebase.getUserById(userId, env.FIREBASE_SERVICE_ACCOUNT);
      if (!currentUser) {
        return jsonResponse({ error: 'User not found' }, 404, corsHeaders);
      }
      
      // Determine plan - use new plan names
      let plan = data.plan || currentUser.plan || 'Başlangıç';
      
      // Normalize old plan names to new ones
      if (plan === 'starter' || plan === 'free') plan = 'Başlangıç';
      if (plan === 'basic') plan = 'Temel';
      if (plan === 'standard') plan = 'Standart';
      
      const isPremium = isPremiumPlan(plan);
      const dailyCredits = getPlanCredits(plan);
      
      // Only update plan-related fields, preserve all other user data
      const updateData = {
        // Plan fields
        plan: plan,
        subscription: plan,
        isPremium: isPremium,
        dailyCredits: dailyCredits,
        updatedAt: new Date().toISOString(),
      };
      
      await firebase.updateUser(userId, updateData, env.FIREBASE_SERVICE_ACCOUNT);
      
      return jsonResponse({
        success: true,
        message: 'Subscription updated successfully',
        userId,
        plan,
        isPremium,
        dailyCredits,
      }, 200, corsHeaders);
    }
    
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Create Demo User
async function handleCreateDemoUser(request, env, corsHeaders) {
  try {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    const demoUserId = 'demo-user-' + Date.now();
    const demoUserData = {
      id: demoUserId,
      name: 'Ahmet Yılmaz',
      email: 'ahmet.yilmaz@example.com',
      displayName: 'Ahmet Yılmaz',
      
      // Education info
      educationLevel: 'Üniversite',
      grade: '2',
      department: 'Yazılım Mühendisliği',
      school: 'İstanbul Teknik Üniversitesi',
      
      // Plan
      plan: 'Premium',
      subscription: 'Premium',
      isPremium: true,
      dailyCredits: 30,
      
      // Usage
      role: 'user',
      used_quota: 5,
      last_usage_date: new Date().toISOString().split('T')[0],
      
      // Metadata
      provider: 'google',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Firestore
    await firebase.createUser(demoUserId, demoUserData, env.FIREBASE_SERVICE_ACCOUNT);

    return jsonResponse({
      success: true,
      message: 'Demo user created successfully',
      user: demoUserData,
    }, 201, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Create New User
async function handleCreateUser(request, env, corsHeaders) {
  try {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.email || !data.name) {
      return jsonResponse({ error: 'Email and name are required' }, 400, corsHeaders);
    }

    const userId = data.id || 'user-' + Date.now();
    const plan = data.plan || 'Başlangıç';
    const isPremium = isPremiumPlan(plan);
    const dailyCredits = getPlanCredits(plan);
    
    const userData = {
      id: userId,
      name: data.name,
      email: data.email,
      displayName: data.name,
      
      // Education info
      educationLevel: data.educationLevel || '',
      grade: data.grade || '',
      department: data.department || '',
      school: data.school || '',
      
      // Plan
      plan: plan,
      subscription: plan,
      isPremium: isPremium,
      dailyCredits: dailyCredits,
      
      // Usage
      role: data.role || 'user',
      used_quota: 0,
      last_usage_date: new Date().toISOString().split('T')[0],
      
      // Metadata
      provider: data.provider || 'email',
      emailVerified: data.emailVerified || false,
      phoneNumber: data.phoneNumber || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Firestore
    await firebase.createUser(userId, userData, env.FIREBASE_SERVICE_ACCOUNT);

    return jsonResponse({
      success: true,
      message: 'User created successfully',
      user: userData,
    }, 201, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Delete User
async function handleDeleteUser(request, env, userId, corsHeaders) {
  try {
    if (request.method !== 'DELETE') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    // Check if user exists
    const user = await firebase.getUserById(userId, env.FIREBASE_SERVICE_ACCOUNT);
    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404, corsHeaders);
    }

    // Delete from Firestore
    await firebase.deleteUser(userId, env.FIREBASE_SERVICE_ACCOUNT);

    return jsonResponse({
      success: true,
      message: 'User deleted successfully',
      userId: userId,
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Update User (Full Update)
async function handleUpdateUser(request, env, userId, corsHeaders) {
  try {
    if (request.method !== 'PUT') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    const data = await request.json();
    
    // Check if user exists
    const currentUser = await firebase.getUserById(userId, env.FIREBASE_SERVICE_ACCOUNT);
    if (!currentUser) {
      return jsonResponse({ error: 'User not found' }, 404, corsHeaders);
    }

    // Prepare update data
    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    // Update profile fields if provided
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    
    // Update education fields if provided
    if (data.educationLevel !== undefined) updateData.educationLevel = data.educationLevel;
    if (data.grade !== undefined) updateData.grade = data.grade;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.school !== undefined) updateData.school = data.school;
    
    // Update plan if provided
    if (data.plan !== undefined) {
      updateData.plan = data.plan;
      updateData.subscription = data.plan;
      updateData.isPremium = isPremiumPlan(data.plan);
      updateData.dailyCredits = getPlanCredits(data.plan);
    }
    
    // Update role if provided
    if (data.role !== undefined) updateData.role = data.role;
    
    // Update usage if provided
    if (data.used_quota !== undefined) updateData.used_quota = data.used_quota;

    // Save to Firestore
    await firebase.updateUser(userId, updateData, env.FIREBASE_SERVICE_ACCOUNT);

    return jsonResponse({
      success: true,
      message: 'User updated successfully',
      userId: userId,
      updates: Object.keys(updateData),
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Handle Config (API Keys, Model Settings)
async function handleConfig(request, env, corsHeaders) {
  try {
    if (request.method === 'GET') {
      // Get stored config from D1
      const db = env.DB;
      const settings = await db.prepare("SELECT * FROM system_settings WHERE key LIKE 'config_%'").all();
      const storedConfig = {};
      for (const setting of settings.results || []) {
        try {
          storedConfig[setting.key.replace('config_', '')] = JSON.parse(setting.value);
        } catch (e) {
          storedConfig[setting.key.replace('config_', '')] = setting.value;
        }
      }
      
      // Return current config (without sensitive data)
      const config = {
        gemini_api_key_set: !!env.GEMINI_API_KEY,
        gemini_api_key_preview: env.GEMINI_API_KEY ? env.GEMINI_API_KEY.slice(0, 10) + '...' : null,
        firebase_api_key_set: !!env.FIREBASE_API_KEY,
        youtube_api_key_set: !!env.YOUTUBE_API_KEY,
        models: [
          { name: 'gemini-3-pro-preview', enabled: true, priority: 1 },
          { name: 'gemini-2.5-pro', enabled: true, priority: 2 },
          { name: 'gemini-2.5-flash', enabled: true, priority: 3 },
          { name: 'gemini-1.5-flash', enabled: true, priority: 4 },
        ],
        default_model: storedConfig.default_model || 'gemini-2.5-pro',
        max_tokens: storedConfig.max_tokens || 4096,
        temperature: storedConfig.temperature || 0.3,
        // Subject-specific model assignments
        subject_models: storedConfig.subject_models || {
          'Matematik': { normal: 'gemini-2.5-pro', shaped: 'gemini-3-pro-preview' },
          'Fizik': { normal: 'gemini-2.5-pro', shaped: 'gemini-3-pro-preview' },
          'Kimya': { normal: 'gemini-2.5-flash', shaped: 'gemini-2.5-pro' },
          'Biyoloji': { normal: 'gemini-2.5-flash', shaped: 'gemini-2.5-pro' },
          'Geometri': { normal: 'gemini-2.5-pro', shaped: 'gemini-3-pro-preview' },
        },
        // Action-specific models
        action_models: storedConfig.action_models || {
          'solve_question': 'gemini-2.5-pro',
          'chat_followup': 'gemini-2.5-flash',
          'explain_concept': 'gemini-2.5-pro',
        },
      };
      return jsonResponse(config, 200, corsHeaders);
    } else if (request.method === 'PUT') {
      const data = await request.json();
      
      // Note: In production, you'd update secrets via wrangler
      // This is a simplified version that stores in D1
      const db = env.DB;
      
      for (const [key, value] of Object.entries(data)) {
        await db.prepare(
          `INSERT INTO system_settings (key, value, updated_at) 
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`
        ).bind(`config_${key}`, JSON.stringify(value), JSON.stringify(value)).run();
      }
      
      return jsonResponse({ 
        success: true, 
        message: 'Config updated. Note: API keys should be updated via wrangler secret put.' 
      }, 200, corsHeaders);
    }
    
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Helper function
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}
