const STORAGE_KEY = 'literacy-platform-frontend-state';

const defaultState = {
  parentToken: '',
  adminToken: '',
  activeRole: '',
  parentId: '',
  childId: '',
  unitId: '',
  lessonId: '',
  exerciseId: '',
};

const state = loadState();

const elements = {
  apiStatus: document.getElementById('api-status'),
  authState: document.getElementById('auth-state'),
  selectedSummary: document.getElementById('selected-summary'),
  parentTokenStatus: document.getElementById('parent-token-status'),
  adminTokenStatus: document.getElementById('admin-token-status'),
  parentIdStatus: document.getElementById('parent-id-status'),
  childIdStatus: document.getElementById('child-id-status'),
  unitIdStatus: document.getElementById('unit-id-status'),
  lessonIdStatus: document.getElementById('lesson-id-status'),
  exerciseIdStatus: document.getElementById('exercise-id-status'),
  parentSummary: document.getElementById('parent-summary'),
  childrenList: document.getElementById('children-list'),
  unitsList: document.getElementById('units-list'),
  lessonsList: document.getElementById('lessons-list'),
  exercisesList: document.getElementById('exercises-list'),
  progressSummary: document.getElementById('progress-summary'),
  badgesList: document.getElementById('badges-list'),
  notificationsList: document.getElementById('notifications-list'),
  leaderboardList: document.getElementById('leaderboard-list'),
  adminStatsView: document.getElementById('admin-stats-view'),
  adminLogsView: document.getElementById('admin-logs-view'),
  consoleOutput: document.getElementById('console-output'),
};

function loadState() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { ...defaultState };
    }

    return {
      ...defaultState,
      ...JSON.parse(stored),
    };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderState() {
  elements.parentTokenStatus.textContent = state.parentToken
    ? 'Stored'
    : 'Missing';
  elements.adminTokenStatus.textContent = state.adminToken ? 'Stored' : 'Missing';
  elements.parentIdStatus.textContent = state.parentId || '—';
  elements.childIdStatus.textContent = state.childId || '—';
  elements.unitIdStatus.textContent = state.unitId || '—';
  elements.lessonIdStatus.textContent = state.lessonId || '—';
  elements.exerciseIdStatus.textContent = state.exerciseId || '—';

  elements.authState.textContent = state.activeRole
    ? `${state.activeRole} session active`
    : 'No token selected';

  const selectedParts = [];
  if (state.childId) selectedParts.push(`Child ${shortId(state.childId)}`);
  if (state.unitId) selectedParts.push(`Unit ${shortId(state.unitId)}`);
  if (state.lessonId) selectedParts.push(`Lesson ${shortId(state.lessonId)}`);
  if (state.exerciseId) {
    selectedParts.push(`Exercise ${shortId(state.exerciseId)}`);
  }
  elements.selectedSummary.textContent =
    selectedParts.join(' • ') || 'None selected yet';

  saveState();
}

function shortId(value) {
  return value.length > 8 ? value.slice(0, 8) : value;
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function writeOutput(title, payload) {
  elements.consoleOutput.textContent = `${title}\n\n${JSON.stringify(
    payload,
    null,
    2,
  )}`;
}

function setEmpty(container, message) {
  container.className = 'resource-grid empty-state';
  container.textContent = message;
}

function parseForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function parseJsonField(value, label) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
}

function getToken(role) {
  if (role === 'admin') {
    return state.adminToken;
  }

  if (role === 'parent') {
    return state.parentToken;
  }

  return '';
}

async function apiRequest(path, options = {}, role = null) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  const token = role ? getToken(role) : '';

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      typeof payload === 'object'
        ? JSON.stringify(payload, null, 2)
        : String(payload),
    );
  }

  return payload;
}

async function runAction(title, fn) {
  try {
    const payload = await fn();
    writeOutput(title, payload);
    renderState();
    return payload;
  } catch (error) {
    const payload = {
      error: error instanceof Error ? error.message : String(error),
    };
    writeOutput(`${title} failed`, payload);
    return null;
  }
}

function buildResourceCard({
  title,
  lines,
  selected = false,
  actions = [],
  extraClass = '',
}) {
  const wrapper = document.createElement('article');
  wrapper.className = `resource-item${selected ? ' selected' : ''}${
    extraClass ? ` ${extraClass}` : ''
  }`;

  const heading = document.createElement('h4');
  heading.textContent = title;
  wrapper.appendChild(heading);

  lines.forEach((line) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = line;
    wrapper.appendChild(paragraph);
  });

  if (actions.length > 0) {
    const actionBox = document.createElement('div');
    actionBox.className = 'resource-actions';

    actions.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      if (action.secondary) {
        button.className = 'secondary-button';
      }
      button.textContent = action.label;
      button.dataset.action = action.name;
      Object.entries(action.dataset || {}).forEach(([key, value]) => {
        button.dataset[key] = String(value);
      });
      actionBox.appendChild(button);
    });

    wrapper.appendChild(actionBox);
  }

  return wrapper;
}

function renderParentSummary(parent) {
  elements.parentSummary.className = 'detail-card';
  elements.parentSummary.innerHTML = `
    <strong>${parent.firstName} ${parent.lastName ?? ''}</strong><br />
    Email: ${parent.email}<br />
    Role: ${parent.role}<br />
    Children: ${parent.childrenCount}<br />
    Created: ${formatDate(parent.createdAt)}
  `;
}

function renderChildren(items) {
  if (!items.length) {
    setEmpty(elements.childrenList, 'No child profiles found yet.');
    return;
  }

  elements.childrenList.className = 'resource-grid';
  elements.childrenList.innerHTML = '';

  items.forEach((child) => {
    const card = buildResourceCard({
      title: child.displayName,
      selected: child.id === state.childId,
      lines: [
        `Username: ${child.username}`,
        `Age: ${child.age} • Level: ${child.learningLevel}`,
        `XP: ${child.xpPoints} • Streak: ${child.streakCount}`,
      ],
      actions: [
        {
          label: child.id === state.childId ? 'Selected' : 'Select Child',
          name: 'select-child',
          dataset: { childId: child.id },
        },
      ],
    });
    elements.childrenList.appendChild(card);
  });
}

function renderUnits(items) {
  if (!items.length) {
    setEmpty(elements.unitsList, 'No units loaded.');
    return;
  }

  elements.unitsList.className = 'resource-grid';
  elements.unitsList.innerHTML = '';

  items.forEach((unit) => {
    const card = buildResourceCard({
      title: unit.title,
      selected: unit.id === state.unitId,
      lines: [
        `Level: ${unit.curriculumLevel} • Order: ${unit.orderIndex}`,
        `Published: ${unit.isPublished ? 'Yes' : 'No'}`,
      ],
      actions: [
        {
          label: unit.id === state.unitId ? 'Selected' : 'Select Unit',
          name: 'select-unit',
          dataset: { unitId: unit.id },
        },
      ],
    });
    elements.unitsList.appendChild(card);
  });
}

function renderLessons(items) {
  if (!items.length) {
    setEmpty(elements.lessonsList, 'No lessons loaded.');
    return;
  }

  elements.lessonsList.className = 'resource-grid';
  elements.lessonsList.innerHTML = '';

  items.forEach((lesson) => {
    const card = buildResourceCard({
      title: lesson.title,
      selected: lesson.id === state.lessonId,
      lines: [
        `Type: ${lesson.lessonType} • Difficulty: ${lesson.difficulty}`,
        `XP: ${lesson.xpReward} • Order: ${lesson.orderIndex}`,
        `Status: ${lesson.status}`,
      ],
      actions: [
        {
          label: lesson.id === state.lessonId ? 'Selected' : 'Select Lesson',
          name: 'select-lesson',
          dataset: { lessonId: lesson.id },
        },
      ],
    });
    elements.lessonsList.appendChild(card);
  });
}

function renderExercises(items) {
  if (!items.length) {
    setEmpty(elements.exercisesList, 'No exercises loaded.');
    return;
  }

  elements.exercisesList.className = 'resource-grid';
  elements.exercisesList.innerHTML = '';

  items.forEach((exercise) => {
    const card = buildResourceCard({
      title: exercise.prompt,
      selected: exercise.id === state.exerciseId,
      lines: [
        `Type: ${exercise.type} • Difficulty: ${exercise.difficulty}`,
        `Order: ${exercise.orderIndex}`,
      ],
      actions: [
        {
          label:
            exercise.id === state.exerciseId ? 'Selected' : 'Select Exercise',
          name: 'select-exercise',
          dataset: { exerciseId: exercise.id },
        },
      ],
    });
    elements.exercisesList.appendChild(card);
  });
}

function renderProgress(payload) {
  const latestProgress = payload.lessonProgress.items[0];
  const latestSubmission = payload.submissions.items[0];

  elements.progressSummary.className = 'detail-card';
  elements.progressSummary.innerHTML = `
    <strong>${payload.child.displayName}</strong><br />
    Overall progress: ${payload.child.overallProgressPercent}%<br />
    XP: ${payload.child.xpPoints} • Level: ${payload.child.gamificationLevel}<br />
    Latest lesson status: ${latestProgress ? latestProgress.status : 'No records'}<br />
    Latest submission: ${latestSubmission ? (latestSubmission.isCorrect ? 'Correct' : 'Incorrect') : 'No submissions'}<br />
    Lesson records: ${payload.lessonProgress.meta.total} • Submission records: ${payload.submissions.meta.total}
  `;
}

function renderBadges(items) {
  if (!items.length) {
    setEmpty(elements.badgesList, 'No badges awarded yet.');
    return;
  }

  elements.badgesList.className = 'resource-grid compact-grid';
  elements.badgesList.innerHTML = '';

  items.forEach((badge) => {
    const pill = document.createElement('div');
    pill.className = 'badge-pill';
    pill.textContent = `${badge.name} (${badge.code})`;
    elements.badgesList.appendChild(pill);
  });
}

function renderNotifications(items) {
  if (!items.length) {
    setEmpty(elements.notificationsList, 'No notifications found.');
    return;
  }

  elements.notificationsList.className = 'resource-grid';
  elements.notificationsList.innerHTML = '';

  items.forEach((notification) => {
    const card = buildResourceCard({
      title: notification.title,
      extraClass: notification.isRead ? '' : 'notification-item unread',
      lines: [
        notification.message,
        `Type: ${notification.type}`,
        `Created: ${formatDate(notification.createdAt)}`,
      ],
      actions: notification.isRead
        ? []
        : [
            {
              label: 'Mark as Read',
              name: 'mark-notification-read',
              dataset: { notificationId: notification.id },
            },
          ],
    });
    elements.notificationsList.appendChild(card);
  });
}

function renderLeaderboard(items) {
  if (!items.length) {
    setEmpty(elements.leaderboardList, 'No leaderboard data available yet.');
    return;
  }

  elements.leaderboardList.className = 'resource-grid';
  elements.leaderboardList.innerHTML = '';

  items.forEach((entry) => {
    const card = buildResourceCard({
      title: `#${entry.rank} ${entry.displayName}`,
      lines: [
        `Age: ${entry.age} • Level: ${entry.gamificationLevel}`,
        `XP: ${entry.xpPoints} • Streak: ${entry.streakCount}`,
      ],
    });
    elements.leaderboardList.appendChild(card);
  });
}

function renderAdminStats(stats) {
  elements.adminStatsView.className = 'detail-card';
  elements.adminStatsView.innerHTML = `
    <strong>Users</strong><br />
    Parents: ${stats.users.totalParents} • Admins: ${stats.users.totalAdmins}<br />
    Children: ${stats.users.totalChildren} • Active: ${stats.users.activeChildren}<br /><br />
    <strong>Content</strong><br />
    Units: ${stats.content.totalUnits} (${stats.content.publishedUnits} published)<br />
    Lessons: ${stats.content.totalLessons} (${stats.content.publishedLessons} published)<br />
    Exercises: ${stats.content.totalExercises}<br /><br />
    <strong>Learning</strong><br />
    Completed lesson records: ${stats.learning.completedLessonRecords}<br />
    Completion rate: ${stats.learning.completionRate}%<br /><br />
    <strong>Notifications</strong><br />
    Total: ${stats.notifications.totalNotifications} • Unread: ${stats.notifications.unreadNotifications}
  `;
}

function renderAdminLogs(items) {
  if (!items.length) {
    setEmpty(elements.adminLogsView, 'No admin logs found.');
    return;
  }

  elements.adminLogsView.className = 'resource-grid';
  elements.adminLogsView.innerHTML = '';

  items.forEach((log) => {
    const card = buildResourceCard({
      title: `${log.action} ${log.entityType}`,
      lines: [
        `Admin: ${log.admin.firstName} ${log.admin.lastName ?? ''} (${log.admin.email})`,
        `Entity ID: ${log.entityId}`,
        `Created: ${formatDate(log.createdAt)}`,
      ],
    });
    elements.adminLogsView.appendChild(card);
  });
}

async function checkHealth() {
  const payload = await runAction('Health Check', () => apiRequest('/health'));
  if (!payload) {
    elements.apiStatus.textContent = 'Unavailable';
    return;
  }
  elements.apiStatus.textContent = `${payload.status.toUpperCase()} • ${formatDate(
    payload.timestamp,
  )}`;
}

async function loadParentProfile() {
  if (!state.parentId || !state.parentToken) {
    throw new Error('Login as parent first');
  }

  const payload = await runAction('Parent Profile Loaded', () =>
    apiRequest(`/parents/${state.parentId}`, {}, 'parent'),
  );
  if (!payload) {
    return;
  }
  renderParentSummary(payload);
}

async function loadChildren() {
  if (!state.parentToken) {
    throw new Error('Login as parent first');
  }

  const payload = await runAction('Children Loaded', () =>
    apiRequest('/children?page=1&page_size=20', {}, 'parent'),
  );
  if (!payload) {
    return;
  }
  renderChildren(payload.items);
}

async function loadUnits() {
  const role = state.parentToken ? 'parent' : state.adminToken ? 'admin' : null;

  if (!role) {
    throw new Error('Login as parent or admin first');
  }

  const payload = await runAction('Units Loaded', () =>
    apiRequest('/units?page=1&page_size=20', {}, role),
  );
  if (!payload) {
    return;
  }
  renderUnits(payload.items);
}

async function loadLessons() {
  const role = state.parentToken ? 'parent' : state.adminToken ? 'admin' : null;

  if (!role) {
    throw new Error('Login as parent or admin first');
  }

  if (!state.unitId) {
    throw new Error('Select a unit first');
  }

  const payload = await runAction('Lessons Loaded', () =>
    apiRequest(
      `/lessons?unitId=${encodeURIComponent(state.unitId)}&page=1&page_size=20`,
      {},
      role,
    ),
  );
  if (!payload) {
    return;
  }
  renderLessons(payload.items);
}

async function loadExercises() {
  const role = state.parentToken ? 'parent' : state.adminToken ? 'admin' : null;

  if (!role) {
    throw new Error('Login as parent or admin first');
  }

  if (!state.lessonId) {
    throw new Error('Select a lesson first');
  }

  const payload = await runAction('Exercises Loaded', () =>
    apiRequest(
      `/lessons/${state.lessonId}/exercises?page=1&page_size=20`,
      {},
      role,
    ),
  );
  if (!payload) {
    return;
  }
  renderExercises(payload.items);
}

async function loadProgress() {
  if (!state.parentToken || !state.childId) {
    throw new Error('Login as parent and select a child first');
  }

  const payload = await runAction('Child Progress Loaded', () =>
    apiRequest(
      `/children/${state.childId}/progress?page=1&page_size=10`,
      {},
      'parent',
    ),
  );
  if (!payload) {
    return;
  }
  renderProgress(payload);
}

async function loadBadges() {
  if (!state.parentToken || !state.childId) {
    throw new Error('Login as parent and select a child first');
  }

  const payload = await runAction('Child Badges Loaded', () =>
    apiRequest(`/children/${state.childId}/badges`, {}, 'parent'),
  );
  if (!payload) {
    return;
  }
  renderBadges(payload);
}

async function loadNotifications() {
  if (!state.parentToken) {
    throw new Error('Login as parent first');
  }

  const payload = await runAction('Notifications Loaded', () =>
    apiRequest('/notifications?page=1&page_size=20', {}, 'parent'),
  );
  if (!payload) {
    return;
  }
  renderNotifications(payload.items);
}

async function loadLeaderboard() {
  const role = state.parentToken ? 'parent' : state.adminToken ? 'admin' : null;

  if (!role) {
    setEmpty(
      elements.leaderboardList,
      'Login as parent or admin to load leaderboard data.',
    );
    return;
  }

  const payload = await runAction('Leaderboard Loaded', () =>
    apiRequest('/leaderboard?page=1&page_size=10', {}, role),
  );
  if (!payload) {
    return;
  }
  renderLeaderboard(payload.items);
}

async function loadAdminStats() {
  if (!state.adminToken) {
    throw new Error('Login as admin first');
  }

  const payload = await runAction('Admin Stats Loaded', () =>
    apiRequest('/admin/stats', {}, 'admin'),
  );
  if (!payload) {
    return;
  }
  renderAdminStats(payload);
}

async function loadAdminLogs() {
  if (!state.adminToken) {
    throw new Error('Login as admin first');
  }

  const payload = await runAction('Admin Logs Loaded', () =>
    apiRequest('/admin/logs?page=1&page_size=10', {}, 'admin'),
  );
  if (!payload) {
    return;
  }
  renderAdminLogs(payload.items);
}

async function triggerAdminJob(path, title) {
  if (!state.adminToken) {
    throw new Error('Login as admin first');
  }

  await runAction(title, () =>
    apiRequest(
      path,
      {
        method: 'POST',
      },
      'admin',
    ),
  );
}

async function logout(role) {
  const token = getToken(role);

  if (!token) {
    return;
  }

  await runAction(
    `${role === 'admin' ? 'Admin' : 'Parent'} Logged Out`,
    () =>
      apiRequest(
        '/auth/logout',
        {
          method: 'POST',
        },
        role,
      ),
  );

  if (role === 'admin') {
    state.adminToken = '';
    if (state.activeRole === 'admin') {
      state.activeRole = state.parentToken ? 'parent' : '';
    }
  } else {
    state.parentToken = '';
    state.parentId = '';
    state.childId = '';
    if (state.activeRole === 'parent') {
      state.activeRole = state.adminToken ? 'admin' : '';
    }
  }

  renderState();
}

function attachEventListeners() {
  document
    .getElementById('health-check')
    .addEventListener('click', () => void checkHealth());

  document
    .getElementById('load-leaderboard-button')
    .addEventListener('click', () => void loadLeaderboard());

  document
    .getElementById('load-leaderboard-sidebar-button')
    .addEventListener('click', () => void loadLeaderboard());

  document
    .getElementById('logout-parent-button')
    .addEventListener('click', () => void logout('parent'));

  document
    .getElementById('logout-admin-button')
    .addEventListener('click', () => void logout('admin'));

  document
    .getElementById('load-parent-profile-button')
    .addEventListener('click', () => void loadParentProfile());

  document
    .getElementById('load-children-button')
    .addEventListener('click', () => void loadChildren());

  document
    .getElementById('load-units-button')
    .addEventListener('click', () => void loadUnits());

  document
    .getElementById('load-lessons-button')
    .addEventListener('click', () => void loadLessons());

  document
    .getElementById('load-exercises-button')
    .addEventListener('click', () => void loadExercises());

  document
    .getElementById('complete-lesson-button')
    .addEventListener('click', () => {
      void runAction('Lesson Completed', async () => {
        if (!state.lessonId || !state.childId) {
          throw new Error('Select a child and lesson first');
        }

        const payload = await apiRequest(
          `/lessons/${state.lessonId}/complete`,
          {
            method: 'POST',
            body: JSON.stringify({
              childId: state.childId,
            }),
          },
          'parent',
        );

        await Promise.allSettled([
          loadProgress(),
          loadBadges(),
          loadNotifications(),
          loadLeaderboard(),
        ]);

        return payload;
      });
    });

  document
    .getElementById('load-progress-button')
    .addEventListener('click', () => void loadProgress());

  document
    .getElementById('load-badges-button')
    .addEventListener('click', () => void loadBadges());

  document
    .getElementById('load-notifications-button')
    .addEventListener('click', () => void loadNotifications());

  document
    .getElementById('load-admin-stats-button')
    .addEventListener('click', () => void loadAdminStats());

  document
    .getElementById('load-admin-logs-button')
    .addEventListener('click', () => void loadAdminLogs());

  document
    .getElementById('run-daily-streak-button')
    .addEventListener('click', () =>
      void triggerAdminJob(
        '/admin/jobs/run-daily-streak-check',
        'Daily Streak Check Triggered',
      ),
    );

  document
    .getElementById('run-streak-reset-button')
    .addEventListener('click', () =>
      void triggerAdminJob(
        '/admin/jobs/run-streak-reset',
        'Streak Reset Triggered',
      ),
    );

  document
    .getElementById('run-weekly-summary-button')
    .addEventListener('click', () =>
      void triggerAdminJob(
        '/admin/jobs/run-weekly-summary',
        'Weekly Summary Job Triggered',
      ),
    );

  document
    .getElementById('parent-register-form')
    .addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;

      void runAction('Parent Registered', async () => {
        const values = parseForm(form);
        const payload = await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify(values),
        });

        state.parentToken = payload.tokens.accessToken;
        state.parentId = payload.user.id;
        state.activeRole = 'parent';

        await Promise.allSettled([
          loadParentProfile(),
          loadChildren(),
          loadUnits(),
          loadNotifications(),
          loadLeaderboard(),
        ]);

        return payload;
      });
    });

  document
    .getElementById('parent-login-form')
    .addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;

      void runAction('Parent Logged In', async () => {
        const values = parseForm(form);
        const payload = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify(values),
        });

        state.parentToken = payload.tokens.accessToken;
        state.parentId = payload.user.id;
        state.activeRole = 'parent';

        await Promise.allSettled([
          loadParentProfile(),
          loadChildren(),
          loadUnits(),
          loadNotifications(),
          loadLeaderboard(),
        ]);

        return payload;
      });
    });

  document
    .getElementById('admin-login-form')
    .addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;

      void runAction('Admin Logged In', async () => {
        const values = parseForm(form);
        const payload = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify(values),
        });

        state.adminToken = payload.tokens.accessToken;
        state.activeRole = 'admin';

        await Promise.allSettled([
          loadUnits(),
          loadAdminStats(),
          loadAdminLogs(),
          loadLeaderboard(),
        ]);

        return payload;
      });
    });

  document
    .getElementById('parent-profile-form')
    .addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;

      void runAction('Parent Updated', async () => {
        if (!state.parentId || !state.parentToken) {
          throw new Error('Login as parent first');
        }

        const values = parseForm(form);
        const payload = await apiRequest(
          `/parents/${state.parentId}`,
          {
            method: 'PUT',
            body: JSON.stringify(values),
          },
          'parent',
        );

        renderParentSummary(payload);
        return payload;
      });
    });

  document.getElementById('child-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    void runAction('Child Created', async () => {
      if (!state.parentToken) {
        throw new Error('Login as parent first');
      }

      const values = parseForm(form);
      const payload = await apiRequest(
        '/children',
        {
          method: 'POST',
          body: JSON.stringify({
            ...values,
            age: Number(values.age),
            learningLevel: Number(values.learningLevel),
          }),
        },
        'parent',
      );

      state.childId = payload.id;
      await Promise.allSettled([loadChildren(), loadParentProfile()]);
      return payload;
    });
  });

  document.getElementById('unit-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    void runAction('Unit Created', async () => {
      const values = parseForm(form);
      const payload = await apiRequest(
        '/units',
        {
          method: 'POST',
          body: JSON.stringify({
            ...values,
            curriculumLevel: Number(values.curriculumLevel),
            orderIndex: Number(values.orderIndex),
            isPublished: values.isPublished === 'on',
          }),
        },
        'admin',
      );

      state.unitId = payload.id;
      await Promise.allSettled([loadUnits(), loadAdminStats(), loadAdminLogs()]);
      return payload;
    });
  });

  document
    .getElementById('lesson-form')
    .addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;

      void runAction('Lesson Created', async () => {
        if (!state.unitId) {
          throw new Error('Select or create a unit first');
        }

        const values = parseForm(form);
        const payload = await apiRequest(
          `/lessons/unit/${state.unitId}`,
          {
            method: 'POST',
            body: JSON.stringify({
              ...values,
              orderIndex: Number(values.orderIndex),
              xpReward: Number(values.xpReward),
            }),
          },
          'admin',
        );

        state.lessonId = payload.id;
        await Promise.allSettled([
          loadLessons(),
          loadAdminStats(),
          loadAdminLogs(),
        ]);
        return payload;
      });
    });

  document
    .getElementById('exercise-form')
    .addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;

      void runAction('Exercise Created', async () => {
        if (!state.lessonId) {
          throw new Error('Select or create a lesson first');
        }

        const values = parseForm(form);
        const payload = await apiRequest(
          `/lessons/${state.lessonId}/exercises`,
          {
            method: 'POST',
            body: JSON.stringify({
              ...values,
              orderIndex: Number(values.orderIndex),
              content: parseJsonField(values.content, 'Content JSON'),
              correctAnswer: parseJsonField(
                values.correctAnswer,
                'Correct Answer JSON',
              ),
            }),
          },
          'admin',
        );

        state.exerciseId = payload.id;
        await Promise.allSettled([loadExercises(), loadAdminLogs()]);
        return payload;
      });
    });

  document.getElementById('submit-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    void runAction('Exercise Submitted', async () => {
      if (!state.parentToken || !state.childId || !state.exerciseId) {
        throw new Error('Login as parent, select a child, and select an exercise');
      }

      const values = parseForm(form);
      const payload = await apiRequest(
        `/exercises/${state.exerciseId}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({
            childId: state.childId,
            answer: parseJsonField(values.answer, 'Answer JSON'),
            timeTakenSeconds: Number(values.timeTakenSeconds),
          }),
        },
        'parent',
      );

      await Promise.allSettled([loadProgress()]);
      return payload;
    });
  });

  elements.childrenList.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-action="select-child"]');

    if (!target) {
      return;
    }

    state.childId = target.dataset.childId || '';
    renderState();
    void Promise.allSettled([loadProgress(), loadBadges(), loadNotifications()]);
  });

  elements.unitsList.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-action="select-unit"]');

    if (!target) {
      return;
    }

    state.unitId = target.dataset.unitId || '';
    state.lessonId = '';
    state.exerciseId = '';
    renderState();
    void loadLessons();
    setEmpty(elements.exercisesList, 'Select a lesson and load its exercises.');
  });

  elements.lessonsList.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-action="select-lesson"]');

    if (!target) {
      return;
    }

    state.lessonId = target.dataset.lessonId || '';
    state.exerciseId = '';
    renderState();
    void loadExercises();
  });

  elements.exercisesList.addEventListener('click', (event) => {
    const target = event.target.closest(
      'button[data-action="select-exercise"]',
    );

    if (!target) {
      return;
    }

    state.exerciseId = target.dataset.exerciseId || '';
    renderState();
  });

  elements.notificationsList.addEventListener('click', (event) => {
    const target = event.target.closest(
      'button[data-action="mark-notification-read"]',
    );

    if (!target) {
      return;
    }

    const notificationId = target.dataset.notificationId;

    void runAction('Notification Updated', async () => {
      const payload = await apiRequest(
        `/notifications/${notificationId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            isRead: true,
          }),
        },
        'parent',
      );

      await loadNotifications();
      return payload;
    });
  });
}

function initializeEmptyViews() {
  setEmpty(
    elements.parentSummary,
    'Login as parent and load the profile to see account details here.',
  );
  setEmpty(elements.childrenList, 'No child data loaded yet.');
  setEmpty(elements.unitsList, 'Load units to browse the curriculum.');
  setEmpty(elements.lessonsList, 'Select a unit and load its lessons.');
  setEmpty(elements.exercisesList, 'Select a lesson and load its exercises.');
  setEmpty(
    elements.progressSummary,
    'Select a child, lesson, and exercise to start learner actions.',
  );
  setEmpty(elements.badgesList, 'Badge data will appear here.');
  setEmpty(
    elements.notificationsList,
    'Load notifications to see parent updates.',
  );
  setEmpty(
    elements.leaderboardList,
    'Login as parent or admin to load leaderboard data.',
  );
  setEmpty(elements.adminStatsView, 'Admin stats will appear here.');
  setEmpty(
    elements.adminLogsView,
    'Load admin logs to see recent content activity.',
  );
  elements.consoleOutput.textContent =
    'Responses from the backend will appear here.';
}

async function boot() {
  initializeEmptyViews();
  renderState();
  attachEventListeners();
  await checkHealth();

  if (state.parentToken && state.parentId) {
    await Promise.allSettled([
      loadParentProfile(),
      loadChildren(),
      loadUnits(),
      loadNotifications(),
      loadLeaderboard(),
    ]);
  } else if (state.adminToken) {
    await Promise.allSettled([
      loadUnits(),
      loadAdminStats(),
      loadAdminLogs(),
      loadLeaderboard(),
    ]);
  }
}

void boot();
