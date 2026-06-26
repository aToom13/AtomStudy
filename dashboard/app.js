// ===== AtomStudy Admin Dashboard =====
// Canlı Firebase veri takibi için dashboard uygulaması

class Dashboard {
    constructor() {
        this.apiKey = localStorage.getItem('firebaseApiKey') || '';
        this.adminToken = localStorage.getItem('adminToken') || '';
        this.backendUrl = 'https://atomstudy-backend.atomstudy25431307.workers.dev';
        this.autoRefreshInterval = null;
        this.currentPage = 'overview';
        this.pagination = {
            users: { page: 1, limit: 20, total: 0 },
            questions: { page: 1, limit: 20, total: 0 }
        };
        this.filters = {
            subject: 'all',
            status: 'all',
            model: 'all'
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuth();
    }

    bindEvents() {
        // Login form
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateTo(page);
            });
        });

        // Auto refresh toggle
        document.getElementById('autoRefresh')?.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.startAutoRefresh();
            } else {
                this.stopAutoRefresh();
            }
        });

        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.refreshData();
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });

        // User search
        document.getElementById('userSearch')?.addEventListener('input', (e) => {
            this.debounce(() => this.loadUsers(1, e.target.value), 500)();
        });

        // Filters
        document.getElementById('filterSubject')?.addEventListener('change', (e) => {
            this.filters.subject = e.target.value;
            this.loadQuestions(1);
        });

        document.getElementById('filterStatus')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.loadQuestions(1);
        });

        document.getElementById('filterModel')?.addEventListener('change', (e) => {
            this.filters.model = e.target.value;
            this.loadQuestions(1);
        });

        // Analytics period
        document.getElementById('analyticsPeriod')?.addEventListener('change', () => {
            this.loadAnalytics();
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });

        // Close modal on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });
    }

    checkAuth() {
        if (this.apiKey && this.adminToken) {
            this.showDashboard();
            this.loadInitialData();
        } else {
            this.showLogin();
        }
    }

    showLogin() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    }

    showDashboard() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
    }

    handleLogin() {
        const apiKey = document.getElementById('apiKey').value;
        const adminToken = document.getElementById('adminToken').value;
        const errorEl = document.getElementById('loginError');

        if (!apiKey || !adminToken) {
            errorEl.textContent = 'Lütfen tüm alanları doldurun';
            errorEl.classList.add('show');
            return;
        }

        // Test the credentials
        this.apiKey = apiKey;
        this.adminToken = adminToken;

        this.apiCall('/api/admin/stats')
            .then(() => {
                localStorage.setItem('firebaseApiKey', apiKey);
                localStorage.setItem('adminToken', adminToken);
                errorEl.classList.remove('show');
                this.showDashboard();
                this.loadInitialData();
                this.showToast('Giriş başarılı', 'success');
            })
            .catch(err => {
                errorEl.textContent = 'Geçersiz API key veya token';
                errorEl.classList.add('show');
                this.apiKey = '';
                this.adminToken = '';
            });
    }

    logout() {
        localStorage.removeItem('firebaseApiKey');
        localStorage.removeItem('adminToken');
        this.apiKey = '';
        this.adminToken = '';
        this.stopAutoRefresh();
        this.showLogin();
    }

    navigateTo(page) {
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

        // Update page title
        const titles = {
            overview: 'Genel Bakış',
            users: 'Kullanıcılar',
            questions: 'Sorular',
            models: 'AI Modelleri',
            analytics: 'Analitik'
        };
        document.getElementById('pageTitle').textContent = titles[page] || page;

        // Show page
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${page}`)?.classList.add('active');

        this.currentPage = page;

        // Load page data
        switch(page) {
            case 'overview':
                this.loadStats();
                this.loadRecentQuestions();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'questions':
                this.loadQuestions();
                break;
            case 'models':
                this.loadModels();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    async apiCall(endpoint, options = {}) {
        const url = `${this.backendUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.adminToken}`,
            'X-Firebase-Api-Key': this.apiKey,
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                this.logout();
                throw new Error('Yetkilendirme hatası');
            }
            const error = await response.json();
            throw new Error(error.error || 'API hatası');
        }

        return response.json();
    }

    loadInitialData() {
        this.loadStats();
        this.loadRecentQuestions();
        this.startAutoRefresh();
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.autoRefreshInterval = setInterval(() => {
            this.refreshData();
        }, 30000); // 30 saniye
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    refreshData() {
        switch(this.currentPage) {
            case 'overview':
                this.loadStats();
                this.loadRecentQuestions();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'questions':
                this.loadQuestions();
                break;
            case 'models':
                this.loadModels();
                break;
        }
        this.updateLastUpdateTime();
    }

    updateLastUpdateTime() {
        const now = new Date();
        document.getElementById('lastUpdate').textContent = now.toLocaleTimeString('tr-TR');
    }

    // ===== STATS =====
    async loadStats() {
        try {
            const stats = await this.apiCall('/api/admin/stats');
            
            document.getElementById('statTotalUsers').textContent = stats.totalUsers?.toLocaleString() || 0;
            document.getElementById('statActiveUsers').textContent = stats.activeUsers?.toLocaleString() || 0;
            document.getElementById('statPremiumUsers').textContent = stats.premiumUsers?.toLocaleString() || 0;
            document.getElementById('statTotalQuestions').textContent = stats.totalQuestions?.toLocaleString() || 0;
            document.getElementById('statSuccessRate').textContent = `${stats.successRate || 0}%`;
            document.getElementById('statTotalCost').textContent = stats.totalCost || '$0.00';
            document.getElementById('statAvgTime').textContent = stats.avgResponseTime || '0s';
            document.getElementById('statTodayQuestions').textContent = stats.todayQuestions || 0;
            
            this.updateLastUpdateTime();
        } catch (err) {
            this.showToast(`İstatistikler yüklenemedi: ${err.message}`, 'error');
        }
    }

    // ===== USERS =====
    async loadUsers(page = 1, search = '') {
        try {
            const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
            const data = await this.apiCall(`/api/admin/users?page=${page}&limit=${this.pagination.users.limit}${searchParam}`);
            
            this.pagination.users = { ...this.pagination.users, page, total: data.total };
            
            const tbody = document.querySelector('#usersTable tbody');
            tbody.innerHTML = '';

            if (data.users?.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="empty-state">
                            <div class="empty-state-icon">👤</div>
                            <p>Kullanıcı bulunamadı</p>
                        </td>
                    </tr>
                `;
            } else {
                data.users?.forEach(user => {
                    const row = document.createElement('tr');
                    const displayName = user.name || user.email || user.id.slice(0, 8) + '...';
                    
                    // Normalize plan name
                    let plan = user.plan || 'Başlangıç';
                    if (plan === 'starter' || plan === 'free') plan = 'Başlangıç';
                    
                    // Get plan badge
                    const planBadges = {
                        'Başlangıç': '<span class="badge badge-info">🆓 Başlangıç</span>',
                        'Temel': '<span class="badge badge-info">📗 Temel</span>',
                        'Standart': '<span class="badge badge-info">📘 Standart</span>',
                        'Premium': '<span class="badge badge-premium">💎 Premium</span>',
                    };
                    const planBadge = planBadges[plan] || `<span class="badge badge-info">${plan}</span>`;
                    
                    // Get daily credits for plan
                    const planCredits = {
                        'Başlangıç': 3,
                        'Temel': 5,
                        'Standart': 10,
                        'Premium': 30,
                    }[plan] || 3;
                    
                    row.innerHTML = `
                        <td>
                            <div class="user-cell">
                                <div class="user-avatar">${(user.name || user.email || '?')[0].toUpperCase()}</div>
                                <div class="user-info">
                                    <div class="user-name">${displayName}</div>
                                    <div class="user-id">${this.truncate(user.id, 12)}</div>
                                </div>
                            </div>
                        </td>
                        <td>${user.email || '-'}</td>
                        <td>${planBadge}</td>
                        <td>${user.used_quota || 0} / ${planCredits}</td>
                        <td>${user.role || 'user'}</td>
                        <td>${this.formatDate(user.createdAt)}</td>
                        <td>
                            <div class="user-actions">
                                <button class="btn-icon" title="Düzenle" onclick="dashboard.openEditUserModal('${user.id}')">✏️</button>
                                <button class="btn-icon" title="Detay" onclick="dashboard.viewUser('${user.id}')">👁️</button>
                                <button class="btn-icon btn-delete" title="Sil" onclick="dashboard.openDeleteConfirmModal('${user.id}', '${displayName.replace(/'/g, "\\'")}')">🗑️</button>
                            </div>
                        </td>
                        <td>${user.role || 'user'}</td>
                        <td>${this.formatDate(user.createdAt)}</td>
                        <td>
                            <button class="btn-action btn-view" onclick="dashboard.viewUser('${user.id}')">
                                Detay
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            }

            this.renderPagination('usersPagination', this.pagination.users, (p) => this.loadUsers(p, search));
        } catch (err) {
            this.showToast(`Kullanıcılar yüklenemedi: ${err.message}`, 'error');
        }
    }

    async viewUser(userId) {
        try {
            const [userData, subscriptionData] = await Promise.all([
                this.apiCall(`/api/admin/users/${userId}`),
                this.apiCall(`/api/admin/users/${userId}/subscription`).catch(() => null)
            ]);
            
            const user = userData.user;
            const sub = subscriptionData || {};
            const modalBody = document.getElementById('userModalBody');
            
            modalBody.innerHTML = `
                <div class="user-detail-header">
                    <div class="user-avatar-large">${(user.name || user.email || '?')[0].toUpperCase()}</div>
                    <div class="user-header-info">
                        <h2>${user.name || user.email || 'İsimsiz Kullanıcı'}</h2>
                        <p>${user.email || 'Email yok'}</p>
                        <div class="user-badges">
                            ${user.isPremium || sub.isPremium 
                                ? '<span class="badge badge-premium">💎 Premium</span>' 
                                : '<span class="badge badge-info">Ücretsiz</span>'}
                            <span class="badge badge-info">${user.role || 'user'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>📊 Kullanıcı Bilgileri</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>User ID</label>
                            <value>${user.id}</value>
                        </div>
                        <div class="detail-item">
                            <label>Telefon</label>
                            <value>${user.phoneNumber || '-'}</value>
                        </div>
                        <div class="detail-item">
                            <label>Provider</label>
                            <value>${user.provider || 'google'}</value>
                        </div>
                        <div class="detail-item">
                            <label>Email Doğrulandı</label>
                            <value>${user.emailVerified ? '✅ Evet' : '❌ Hayır'}</value>
                        </div>
                        <div class="detail-item">
                            <label>Kayıt Tarihi</label>
                            <value>${this.formatDate(user.createdAt)}</value>
                        </div>
                        <div class="detail-item">
                            <label>Son Kullanım</label>
                            <value>${this.formatDate(user.last_usage_date)}</value>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>🎓 Eğitim Bilgileri</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Eğitim Seviyesi</label>
                            <value>${user.educationLevel || '-'}</value>
                        </div>
                        <div class="detail-item">
                            <label>Sınıf/Yıl</label>
                            <value>${user.grade || '-'}</value>
                        </div>
                        <div class="detail-item">
                            <label>Bölüm/Alan</label>
                            <value>${user.department || '-'}</value>
                        </div>
                        <div class="detail-item">
                            <label>Okul/Üniversite</label>
                            <value>${user.school || '-'}</value>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>💳 Abonelik Yönetimi</h4>
                    <div class="subscription-manager">
                        <div class="current-plan">
                            <div class="plan-info">
                                <h5>Mevcut Plan</h5>
                                <p class="plan-name">${sub.plan || user.plan || 'Başlangıç'}</p>
                                <p class="quota-info">Günlük Kredi: ${sub.dailyCredits || user.dailyCredits || 3}</p>
                                <p class="quota-info">Kullanım: ${sub.used_quota || user.used_quota || 0} soru</p>
                            </div>
                        </div>
                        <div class="plan-actions">
                            <button class="btn-secondary ${(sub.plan === 'Başlangıç' || user.plan === 'Başlangıç') ? 'active' : ''}" 
                                onclick="dashboard.updateSubscription('${userId}', 'Başlangıç')">
                                🆓 Başlangıç (3/gün)
                            </button>
                            <button class="btn-secondary ${(sub.plan === 'Temel' || user.plan === 'Temel') ? 'active' : ''}" 
                                onclick="dashboard.updateSubscription('${userId}', 'Temel')">
                                📗 Temel (5/gün)
                            </button>
                            <button class="btn-secondary ${(sub.plan === 'Standart' || user.plan === 'Standart') ? 'active' : ''}" 
                                onclick="dashboard.updateSubscription('${userId}', 'Standart')">
                                📘 Standart (10/gün)
                            </button>
                            <button class="btn-secondary ${(sub.plan === 'Premium' || user.plan === 'Premium' || sub.isPremium || user.isPremium) ? 'active' : ''}" 
                                onclick="dashboard.updateSubscription('${userId}', 'Premium')">
                                💎 Premium (30/gün)
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>❓ Son Sorular (${userData.recentQuestions?.length || 0})</h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Ders</th>
                                    <th>Konu</th>
                                    <th>Model</th>
                                    <th>Durum</th>
                                    <th>Tarih</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${userData.recentQuestions?.map(q => `
                                    <tr>
                                        <td>${q.subject || '-'}</td>
                                        <td>${q.topic || '-'}</td>
                                        <td>${q.model_used || q.model || '-'}</td>
                                        <td>
                                            ${q.status === 'success' || !q.error
                                                ? '<span class="badge badge-success">✅</span>'
                                                : '<span class="badge badge-error">❌</span>'}
                                        </td>
                                        <td>${this.formatDate(q.created_at)}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="5" class="empty-state">Henüz soru sorulmamış</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            document.getElementById('userModal').classList.add('show');
        } catch (err) {
            this.showToast(`Kullanıcı detayı yüklenemedi: ${err.message}`, 'error');
        }
    }

    async updateSubscription(userId, plan) {
        try {
            await this.apiCall(`/api/admin/users/${userId}/subscription`, {
                method: 'PUT',
                body: JSON.stringify({ plan })
            });
            
            // Get daily credits for the plan
            const credits = {
                'Başlangıç': 3,
                'Temel': 5,
                'Standart': 10,
                'Premium': 30
            }[plan] || 3;
            
            this.showToast(`✅ Kullanıcı ${plan} planına geçirildi! (${credits} kredi/gün)`, 'success');
            this.viewUser(userId); // Refresh modal
        } catch (err) {
            this.showToast(`❌ Plan değiştirilemedi: ${err.message}`, 'error');
        }
    }



    // ===== QUESTIONS =====
    async loadQuestions(page = 1) {
        try {
            let url = `/api/admin/questions?page=${page}&limit=${this.pagination.questions.limit}`;
            
            if (this.filters.subject !== 'all') {
                url += `&subject=${encodeURIComponent(this.filters.subject)}`;
            }
            if (this.filters.status !== 'all') {
                url += `&status=${this.filters.status}`;
            }
            if (this.filters.model !== 'all') {
                url += `&model=${encodeURIComponent(this.filters.model)}`;
            }
            
            const data = await this.apiCall(url);
            
            this.pagination.questions = { ...this.pagination.questions, page, total: data.total };
            
            const tbody = document.querySelector('#questionsTable tbody');
            tbody.innerHTML = '';

            if (data.questions?.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" class="empty-state">
                            <div class="empty-state-icon">❓</div>
                            <p>Soru bulunamadı</p>
                        </td>
                    </tr>
                `;
            } else {
                data.questions?.forEach(q => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${q.user_name || this.truncate(q.userId, 10) || '-'}</td>
                        <td>${q.subject || '-'}</td>
                        <td>${q.topic || '-'}</td>
                        <td>${q.model_used || q.model || '-'}</td>
                        <td>
                            ${q.status === 'success' || !q.error
                                ? '<span class="badge badge-success">✅ Başarılı</span>'
                                : '<span class="badge badge-error">❌ Hata</span>'}
                        </td>
                        <td>$${(q.cost_usd || 0).toFixed(3)}</td>
                        <td>${q.response_time_ms ? (q.response_time_ms / 1000).toFixed(1) + 's' : '-'}</td>
                        <td>${this.formatDate(q.created_at)}</td>
                        <td>
                            <button class="btn-action btn-view" onclick="dashboard.viewQuestion('${q.id}')">
                                Detay
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            }

            this.renderPagination('questionsPagination', this.pagination.questions, (p) => this.loadQuestions(p));
        } catch (err) {
            this.showToast(`Sorular yüklenemedi: ${err.message}`, 'error');
        }
    }

    async loadRecentQuestions() {
        try {
            const data = await this.apiCall('/api/admin/questions?page=1&limit=10');
            
            const tbody = document.querySelector('#recentQuestionsTable tbody');
            tbody.innerHTML = '';

            data.questions?.forEach(q => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${q.user_name || this.truncate(q.userId, 10) || '-'}</td>
                    <td>${q.subject || '-'}</td>
                    <td>${q.topic || '-'}</td>
                    <td>${q.model_used || q.model || '-'}</td>
                    <td>
                        ${q.status === 'success' || !q.error
                            ? '<span class="badge badge-success">✅</span>'
                            : '<span class="badge badge-error">❌</span>'}
                    </td>
                    <td>${q.response_time_ms ? (q.response_time_ms / 1000).toFixed(1) + 's' : '-'}</td>
                    <td>${this.formatDate(q.created_at)}</td>
                `;
                tbody.appendChild(row);
            });
        } catch (err) {
            console.error('Son sorular yüklenemedi:', err);
        }
    }

    async viewQuestion(questionId) {
        try {
            const data = await this.apiCall(`/api/admin/questions/${questionId}`);
            const q = data.question;
            
            const modalBody = document.getElementById('questionModalBody');
            modalBody.innerHTML = `
                <div class="question-detail-header">
                    <div class="question-meta">
                        <span class="badge badge-info">${q.subject || 'Matematik'}</span>
                        <span class="badge badge-warning">${q.topic || 'Genel'}</span>
                        <span class="badge ${q.status === 'success' ? 'badge-success' : 'badge-error'}">
                            ${q.status === 'success' ? '✅ Başarılı' : '❌ Hata'}
                        </span>
                    </div>
                    <h3>Soru #${questionId.slice(0, 8)}...</h3>
                    <p class="question-user">👤 ${q.user_name || q.userId} • 📅 ${this.formatDate(q.created_at)}</p>
                </div>
                
                <div class="detail-section">
                    <h4>📊 İşlem Bilgileri</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Kullanılan Model</label>
                            <value>${q.model_used || q.model || '-'}</value>
                        </div>
                        <div class="detail-item">
                            <label>Yanıt Süresi</label>
                            <value>${q.response_time_ms ? (q.response_time_ms / 1000).toFixed(1) + 's' : '-'}</value>
                        </div>
                        <div class="detail-item">
                            <label>Maliyet</label>
                            <value>$${(q.cost_usd || 0).toFixed(3)}</value>
                        </div>
                        <div class="detail-item">
                            <label>Token Sayısı</label>
                            <value>${q.token_count || q.tokens || '-'}</value>
                        </div>
                    </div>
                </div>
                
                ${q.error ? `
                <div class="detail-section error-section">
                    <h4>❌ Hata Detayı</h4>
                    <div class="error-box">
                        <pre>${q.error}</pre>
                    </div>
                </div>
                ` : ''}
                
                <div class="detail-section">
                    <h4>📝 Ham Veri (Debug)</h4>
                    <div class="raw-data">
                        <pre>${JSON.stringify(q, null, 2)}</pre>
                    </div>
                </div>
            `;
            
            document.getElementById('questionModal').classList.add('show');
        } catch (err) {
            this.showToast(`Soru detayı yüklenemedi: ${err.message}`, 'error');
        }
    }

    // ===== MODELS =====
    async loadModels() {
        try {
            const models = await this.apiCall('/api/admin/models');
            
            const grid = document.getElementById('modelsGrid');
            grid.innerHTML = '';

            models?.forEach(model => {
                const card = document.createElement('div');
                card.className = 'model-card';
                card.innerHTML = `
                    <div class="model-header">
                        <div>
                            <div class="model-name">${model.name}</div>
                            <div class="model-provider">${model.provider}</div>
                        </div>
                        <span class="badge ${model.status === 'active' ? 'badge-success' : 'badge-warning'}">
                            ${model.status === 'active' ? '🟢 Aktif' : '🟡 Yedek'}
                        </span>
                    </div>
                    <p style="color: var(--text-secondary); font-size: 14px; margin-top: 8px;">
                        ${model.description}
                    </p>
                    <div class="model-stats">
                        <div class="model-stat">
                            <div class="model-stat-value">${model.total_usage_count || 0}</div>
                            <div class="model-stat-label">Kullanım</div>
                        </div>
                        <div class="model-stat">
                            <div class="model-stat-value">${model.success_count || 0}</div>
                            <div class="model-stat-label">Başarılı</div>
                        </div>
                        <div class="model-stat">
                            <div class="model-stat-value">$${(model.total_cost_usd || 0).toFixed(2)}</div>
                            <div class="model-stat-label">Maliyet</div>
                        </div>
                        <div class="model-stat">
                            <div class="model-stat-value">${model.avg_response_time_ms || 0}ms</div>
                            <div class="model-stat-label">Ort. Süre</div>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
        } catch (err) {
            this.showToast(`Modeller yüklenemedi: ${err.message}`, 'error');
        }
    }

    // ===== ANALYTICS =====
    async loadAnalytics() {
        try {
            const days = document.getElementById('analyticsPeriod')?.value || 30;
            const analytics = await this.apiCall(`/api/admin/analytics?days=${days}`);
            
            // Simple analytics display - in a real app, you'd use a chart library
            this.renderSimpleCharts(analytics);
        } catch (err) {
            this.showToast(`Analitik yüklenemedi: ${err.message}`, 'error');
        }
    }

    renderSimpleCharts(analytics) {
        // For now, show a simple text-based chart
        // In production, integrate Chart.js or similar
        const chartsGrid = document.querySelector('.charts-grid');
        
        if (!analytics || analytics.length === 0) {
            chartsGrid.innerHTML = `
                <div class="chart-card" style="grid-column: 1 / -1;">
                    <div class="empty-state">
                        <div class="empty-state-icon">📊</div>
                        <h3>Henüz veri yok</h3>
                        <p>Analitik verileri yakında burada görüntülenecek</p>
                    </div>
                </div>
            `;
            return;
        }

        // Simple bar chart representation using divs
        const maxQuestions = Math.max(...analytics.map(a => a.total_questions || 0));
        
        chartsGrid.innerHTML = `
            <div class="chart-card">
                <h3>Günlük Soru Sayısı</h3>
                <div style="display: flex; align-items: flex-end; gap: 4px; height: 200px; margin-top: 20px;">
                    ${analytics.slice(0, 14).reverse().map(day => {
                        const height = maxQuestions > 0 ? (day.total_questions / maxQuestions) * 100 : 0;
                        return `
                            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                                <div style="
                                    width: 100%; 
                                    height: ${height}%; 
                                    background: linear-gradient(to top, var(--primary), var(--secondary));
                                    border-radius: 4px 4px 0 0;
                                    min-height: 4px;
                                    transition: height 0.3s ease;
                                " title="${day.total_questions} soru"></div>
                                <span style="font-size: 10px; color: var(--text-muted); transform: rotate(-45deg); transform-origin: center;">
                                    ${day.date?.slice(5) || ''}
                                </span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <div class="chart-card">
                <h3>Özet İstatistikler</h3>
                <div style="margin-top: 20px;">
                    ${analytics.slice(0, 7).map(day => `
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border);">
                            <span style="color: var(--text-secondary);">${day.date}</span>
                            <div style="display: flex; gap: 20px;">
                                <span title="Sorular">❓ ${day.total_questions || 0}</span>
                                <span title="Kullanıcılar">👥 ${day.active_users || 0}</span>
                                <span title="Maliyet">💰 $${(day.total_cost || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // ===== PAGINATION =====
    renderPagination(containerId, pagination, callback) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const totalPages = Math.ceil(pagination.total / pagination.limit);
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';
        
        // Previous button
        html += `<button ${pagination.page === 1 ? 'disabled' : ''} onclick="${callback.name}(${pagination.page - 1})">←</button>`;
        
        // Page numbers
        const maxButtons = 5;
        let startPage = Math.max(1, pagination.page - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        
        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        
        if (startPage > 1) {
            html += `<button onclick="${callback.name}(1)">1</button>`;
            if (startPage > 2) html += `<span>...</span>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="${i === pagination.page ? 'active' : ''}" onclick="${callback.name}(${i})">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span>...</span>`;
            html += `<button onclick="${callback.name}(${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        html += `<button ${pagination.page === totalPages ? 'disabled' : ''} onclick="${callback.name}(${pagination.page + 1})">→</button>`;
        
        // We need to use a different approach since we're using class methods
        // Let's rebuild with event listeners
        container.innerHTML = '';
        
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '←';
        prevBtn.disabled = pagination.page === 1;
        prevBtn.onclick = () => callback(pagination.page - 1);
        container.appendChild(prevBtn);
        
        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.className = i === pagination.page ? 'active' : '';
            btn.onclick = () => callback(i);
            container.appendChild(btn);
        }
        
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '→';
        nextBtn.disabled = pagination.page === totalPages;
        nextBtn.onclick = () => callback(pagination.page + 1);
        container.appendChild(nextBtn);
    }

    // ===== MODALS =====
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    closeModal(modalId) {
        document.getElementById(modalId)?.classList.remove('show');
    }

    openModal(modalId) {
        document.getElementById(modalId)?.classList.add('show');
    }

    // ===== USER CRUD OPERATIONS =====
    
    // Open Create User Modal
    openCreateUserModal() {
        document.getElementById('createUserForm').reset();
        this.openModal('createUserModal');
    }

    // Create New User
    async createUser(formData) {
        try {
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                phoneNumber: formData.get('phone'),
                educationLevel: formData.get('education'),
                grade: formData.get('grade'),
                department: formData.get('department'),
                school: formData.get('school'),
                plan: formData.get('plan'),
                role: formData.get('role'),
            };

            const result = await this.apiCall('/api/admin/users', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            this.showToast(`✅ ${result.user.name} başarıyla oluşturuldu!`, 'success');
            this.closeModal('createUserModal');
            this.loadUsers(); // Refresh list
        } catch (err) {
            this.showToast(`❌ Kullanıcı oluşturulamadı: ${err.message}`, 'error');
        }
    }

    // Open Edit User Modal
    async openEditUserModal(userId) {
        try {
            const data = await this.apiCall(`/api/admin/users/${userId}`);
            const user = data.user;

            // Fill form fields
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editUserName').value = user.name || '';
            document.getElementById('editUserEmail').value = user.email || '';
            document.getElementById('editUserPhone').value = user.phoneNumber || '';
            document.getElementById('editUserEducation').value = user.educationLevel || '';
            document.getElementById('editUserGrade').value = user.grade || '';
            document.getElementById('editUserDepartment').value = user.department || '';
            document.getElementById('editUserSchool').value = user.school || '';
            document.getElementById('editUserPlan').value = user.plan || 'Başlangıç';
            document.getElementById('editUserRole').value = user.role || 'user';

            this.openModal('editUserModal');
        } catch (err) {
            this.showToast(`❌ Kullanıcı bilgileri yüklenemedi: ${err.message}`, 'error');
        }
    }

    // Update User
    async updateUser(formData) {
        try {
            const userId = formData.get('id');
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                phoneNumber: formData.get('phone'),
                educationLevel: formData.get('education'),
                grade: formData.get('grade'),
                department: formData.get('department'),
                school: formData.get('school'),
                plan: formData.get('plan'),
                role: formData.get('role'),
            };

            // Remove empty values
            Object.keys(data).forEach(key => {
                if (data[key] === '' || data[key] === null || data[key] === undefined) {
                    delete data[key];
                }
            });

            await this.apiCall(`/api/admin/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });

            this.showToast(`✅ Kullanıcı başarıyla güncellendi!`, 'success');
            this.closeModal('editUserModal');
            this.loadUsers(); // Refresh list
        } catch (err) {
            this.showToast(`❌ Kullanıcı güncellenemedi: ${err.message}`, 'error');
        }
    }

    // Open Delete Confirm Modal
    openDeleteConfirmModal(userId, userName) {
        this.userToDelete = userId;
        document.getElementById('deleteUserInfo').textContent = userName || userId;
        document.getElementById('confirmDeleteBtn').onclick = () => this.confirmDeleteUser();
        this.openModal('deleteConfirmModal');
    }

    // Confirm and Delete User
    async confirmDeleteUser() {
        if (!this.userToDelete) return;

        try {
            await this.apiCall(`/api/admin/users/${this.userToDelete}`, {
                method: 'DELETE'
            });

            this.showToast(`✅ Kullanıcı başarıyla silindi!`, 'success');
            this.closeModal('deleteConfirmModal');
            this.userToDelete = null;
            this.loadUsers(); // Refresh list
        } catch (err) {
            this.showToast(`❌ Kullanıcı silinemedi: ${err.message}`, 'error');
        }
    }

    // ===== SETTINGS =====
    async loadSettings() {
        try {
            const config = await this.apiCall('/api/admin/config');
            
            // Update API status badges
            const geminiStatus = document.getElementById('geminiKeyStatus');
            if (geminiStatus) {
                geminiStatus.textContent = config.gemini_api_key_set ? '✅ Aktif' : '❌ Eksik';
                geminiStatus.className = 'api-badge ' + (config.gemini_api_key_set ? 'success' : 'warning');
            }
            
            const firebaseStatus = document.getElementById('firebaseKeyStatus');
            if (firebaseStatus) {
                firebaseStatus.textContent = config.firebase_api_key_set ? '✅ Aktif' : '❌ Eksik';
                firebaseStatus.className = 'api-badge ' + (config.firebase_api_key_set ? 'success' : 'warning');
            }
            
            const youtubeStatus = document.getElementById('youtubeKeyStatus');
            if (youtubeStatus) {
                youtubeStatus.textContent = config.youtube_api_key_set ? '✅ Aktif' : '⚪ Bilinmiyor';
                youtubeStatus.className = 'api-badge ' + (config.youtube_api_key_set ? 'success' : '');
            }
            
            // Update model settings
            const defaultModel = document.getElementById('defaultModel');
            if (defaultModel) defaultModel.value = config.default_model || 'gemini-2.5-pro';
            
            const maxTokens = document.getElementById('maxTokens');
            if (maxTokens) maxTokens.value = config.max_tokens || 4096;
            
            const temperature = document.getElementById('temperature');
            if (temperature) temperature.value = config.temperature || 0.3;
            
            const tempValue = document.getElementById('temperatureValue');
            if (tempValue) tempValue.textContent = config.temperature || 0.3;
            
            // Load subject models
            this.loadSubjectModelsUI(config.subject_models);
            
            // Load action models
            this.loadActionModelsUI(config.action_models);
            
            // Temperature slider event
            const tempSlider = document.getElementById('temperature');
            if (tempSlider) {
                tempSlider.addEventListener('input', (e) => {
                    document.getElementById('temperatureValue').textContent = e.target.value;
                });
            }
            
        } catch (err) {
            this.showToast('Ayarlar yüklenemedi: ' + err.message, 'error');
        }
    }

// ===== MODAL HELPERS =====
closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('show');
}

openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('show');
}

// ===== USER CRUD OPERATIONS =====

openCreateUserModal() {
    const form = document.getElementById('createUserForm');
    if (form) form.reset();
    this.openModal('createUserModal');
}

async createUser(formData) {
    try {
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            phoneNumber: formData.get('phone') || '',
            educationLevel: formData.get('education') || '',
            grade: formData.get('grade') || '',
            department: formData.get('department') || '',
            school: formData.get('school') || '',
            plan: formData.get('plan') || 'Başlangıç',
            role: formData.get('role') || 'user',
        };

        const result = await this.apiCall('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        this.showToast(result.user.name + ' başarıyla oluşturuldu!', 'success');
        this.closeModal('createUserModal');
        this.loadUsers();
    } catch (err) {
        this.showToast('Kullanıcı oluşturulamadı: ' + err.message, 'error');
    }
}

async openEditUserModal(userId) {
    try {
        const data = await this.apiCall('/api/admin/users/' + userId);
        const user = data.user;

        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUserName').value = user.name || '';
        document.getElementById('editUserEmail').value = user.email || '';
        document.getElementById('editUserPhone').value = user.phoneNumber || '';
        document.getElementById('editUserEducation').value = user.educationLevel || '';
        document.getElementById('editUserGrade').value = user.grade || '';
        document.getElementById('editUserDepartment').value = user.department || '';
        document.getElementById('editUserSchool').value = user.school || '';
        document.getElementById('editUserPlan').value = user.plan || 'Başlangıç';
        document.getElementById('editUserRole').value = user.role || 'user';

        this.openModal('editUserModal');
    } catch (err) {
        this.showToast('Kullanıcı bilgileri yüklenemedi: ' + err.message, 'error');
    }
}

async updateUser(formData) {
    try {
        const userId = formData.get('id');
        const data = {};
        
        if (formData.get('name')) data.name = formData.get('name');
        if (formData.get('email')) data.email = formData.get('email');
        if (formData.get('phone')) data.phoneNumber = formData.get('phone');
        if (formData.get('education')) data.educationLevel = formData.get('education');
        if (formData.get('grade')) data.grade = formData.get('grade');
        if (formData.get('department')) data.department = formData.get('department');
        if (formData.get('school')) data.school = formData.get('school');
        if (formData.get('plan')) data.plan = formData.get('plan');
        if (formData.get('role')) data.role = formData.get('role');

        await this.apiCall('/api/admin/users/' + userId, {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        this.showToast('Kullanıcı başarıyla güncellendi!', 'success');
        this.closeModal('editUserModal');
        this.loadUsers();
    } catch (err) {
        this.showToast('Kullanıcı güncellenemedi: ' + err.message, 'error');
    }
}

openDeleteConfirmModal(userId, userName) {
    this.userToDelete = userId;
    document.getElementById('deleteUserInfo').textContent = userName || userId;
    document.getElementById('confirmDeleteBtn').onclick = () => this.confirmDeleteUser();
    this.openModal('deleteConfirmModal');
}

async confirmDeleteUser() {
    if (!this.userToDelete) return;

    try {
        await this.apiCall('/api/admin/users/' + this.userToDelete, {
            method: 'DELETE'
        });

        this.showToast('Kullanıcı başarıyla silindi!', 'success');
        this.closeModal('deleteConfirmModal');
        this.userToDelete = null;
        this.loadUsers();
    } catch (err) {
        this.showToast('Kullanıcı silinemedi: ' + err.message, 'error');
    }
}

    loadSubjectModelsUI(subjectModels) {
        const container = document.getElementById('subjectModelsGrid');
        if (!container) return;
        
        const subjects = [
            { key: 'Matematik', name: '📐 Matematik' },
            { key: 'Fizik', name: '⚛️ Fizik' },
            { key: 'Kimya', name: '⚗️ Kimya' },
            { key: 'Biyoloji', name: '🧬 Biyoloji' },
            { key: 'Geometri', name: '📏 Geometri' },
            { key: 'Türkçe', name: '📝 Türkçe' },
            { key: 'Tarih', name: '🏛️ Tarih' },
            { key: 'Coğrafya', name: '🌍 Coğrafya' },
        ];
        
        container.innerHTML = subjects.map(sub => {
            const models = subjectModels?.[sub.key] || { normal: 'gemini-2.5-pro', shaped: 'gemini-2.5-pro' };
            return `
                <div class="subject-model-item">
                    <div class="subject-name">${sub.name}</div>
                    <div class="model-inputs">
                        <div class="model-input-group">
                            <label>Normal Soru</label>
                            <input type="text" class="subject-model-normal" data-subject="${sub.key}" 
                                value="${models.normal}" placeholder="gemini-2.5-pro">
                        </div>
                        <div class="model-input-group">
                            <label>Şekilli/Görsel Soru</label>
                            <input type="text" class="subject-model-shaped" data-subject="${sub.key}" 
                                value="${models.shaped}" placeholder="gemini-3-pro-preview">
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    loadActionModelsUI(actionModels) {
        const container = document.getElementById('actionModelsGrid');
        if (!container) return;
        
        const actions = [
            { key: 'solve_question', name: '❓ Soru Çözümü' },
            { key: 'chat_followup', name: '💬 Sohbet/Devam' },
            { key: 'explain_concept', name: '📚 Konu Anlatımı' },
            { key: 'generate_quiz', name: '📝 Quiz Oluştur' },
            { key: 'summarize', name: '📋 Özet Çıkar' },
        ];
        
        container.innerHTML = actions.map(action => {
            const model = actionModels?.[action.key] || 'gemini-2.5-pro';
            return `
                <div class="action-model-item">
                    <div class="action-name">${action.name}</div>
                    <div class="model-input">
                        <input type="text" class="action-model-input" data-action="${action.key}" 
                            value="${model}" placeholder="gemini-2.5-pro">
                    </div>
                </div>
            `;
        }).join('');
    }

    async saveModelSettings() {
        const defaultModel = document.getElementById('defaultModel').value;
        const maxTokens = parseInt(document.getElementById('maxTokens').value);
        const temperature = parseFloat(document.getElementById('temperature').value);
        
        try {
            await this.apiCall('/api/admin/config', {
                method: 'PUT',
                body: JSON.stringify({
                    default_model: defaultModel,
                    max_tokens: maxTokens,
                    temperature: temperature
                })
            });
            
            this.showToast('✅ Model ayarları kaydedildi!', 'success');
        } catch (err) {
            this.showToast(`❌ Model ayarları kaydedilemedi: ${err.message}`, 'error');
        }
    }

    async saveSubjectModels() {
        const subjectModels = {};
        document.querySelectorAll('.subject-model-normal').forEach(input => {
            const subject = input.dataset.subject;
            const normal = input.value;
            const shaped = document.querySelector(`.subject-model-shaped[data-subject="${subject}"]`).value;
            subjectModels[subject] = { normal, shaped };
        });
        
        try {
            await this.apiCall('/api/admin/config', {
                method: 'PUT',
                body: JSON.stringify({ subject_models: subjectModels })
            });
            this.showToast('✅ Ders model ayarları kaydedildi!', 'success');
        } catch (err) {
            this.showToast(`❌ Kaydedilemedi: ${err.message}`, 'error');
        }
    }

    async saveActionModels() {
        const actionModels = {};
        document.querySelectorAll('.action-model-input').forEach(input => {
            const action = input.dataset.action;
            actionModels[action] = input.value;
        });
        
        try {
            await this.apiCall('/api/admin/config', {
                method: 'PUT',
                body: JSON.stringify({ action_models: actionModels })
            });
            this.showToast('✅ İşlem model ayarları kaydedildi!', 'success');
        } catch (err) {
            this.showToast(`❌ Kaydedilemedi: ${err.message}`, 'error');
        }
    }

    // ===== UTILS =====
    truncate(str, length) {
        if (!str) return '-';
        return str.length > length ? str.slice(0, length) + '...' : str;
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        return date.toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
}

// Initialize dashboard
const dashboard = new Dashboard();
