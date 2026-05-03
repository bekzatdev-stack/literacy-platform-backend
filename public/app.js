const state = {
  parentToken: '',
  adminToken: '',
  activeRole: '',
  parentId: '',
  childId: '',
  unitId: '',
  lessonId: '',
  exerciseId: '',
};

const output = document.getElementById('console-output');
const stateViewer = document.getElementById('state-viewer');
const authState = document.getElementById('auth-state');

function renderState() {
  stateViewer.textContent = JSON.stringify(
    {
      ...state,
      parentToken: state.parentToken ? '[stored]' : '',
      adminToken: state.adminToken ? '[stored]' : '',
    },
    null,
    2,
  );

  authState.textContent = state.activeRole
    ? `${state.activeRole} token active`
    : 'No token selected';
}

function writeOutput(title, payload) {
  output.textContent = `${title}\n\n${JSON.stringify(payload, null, 2)}`;
}

function getToken(role) {
  if (role === 'admin') {
    return state.adminToken;
  }

  return state.parentToken;
}

async function apiRequest(path, options = {}, role = null) {
  const headers = {
    'Content-Type': 'application/json',
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

async function runAction(title, fn) {
  try {
    const payload = await fn();
    writeOutput(title, payload);
    renderState();
  } catch (error) {
    writeOutput(`${title} failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

document.getElementById('health-check').addEventListener('click', () => {
  runAction('Health Check', () => apiRequest('/health'));
});

document
  .getElementById('parent-register-form')
  .addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    runAction('Parent Registered', async () => {
      const values = parseForm(form);
      const payload = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(values),
      });

      state.parentToken = payload.tokens.accessToken;
      state.parentId = payload.user.id;
      state.activeRole = 'parent';
      return payload;
    });
  });

document
  .getElementById('parent-login-form')
  .addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    runAction('Parent Logged In', async () => {
      const values = parseForm(form);
      const payload = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });

      state.parentToken = payload.tokens.accessToken;
      state.parentId = payload.user.id;
      state.activeRole = 'parent';
      return payload;
    });
  });

document
  .getElementById('admin-login-form')
  .addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    runAction('Admin Logged In', async () => {
      const values = parseForm(form);
      const payload = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });

      state.adminToken = payload.tokens.accessToken;
      state.activeRole = 'admin';
      return payload;
    });
  });

document.getElementById('child-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  runAction('Child Created', async () => {
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
    return payload;
  });
});

document.getElementById('unit-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  runAction('Unit Created', async () => {
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
    return payload;
  });
});

document.getElementById('lesson-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  runAction('Lesson Created', async () => {
    if (!state.unitId) {
      throw new Error('Create a unit first');
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
    return payload;
  });
});

document
  .getElementById('exercise-form')
  .addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    runAction('Exercise Created', async () => {
      if (!state.lessonId) {
        throw new Error('Create a lesson first');
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
      return payload;
    });
  });

document.getElementById('submit-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  runAction('Exercise Submitted', async () => {
    if (!state.exerciseId || !state.childId) {
      throw new Error('Create child and exercise first');
    }

    const values = parseForm(form);
    return apiRequest(
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
  });
});

document
  .getElementById('complete-lesson-button')
  .addEventListener('click', () => {
    runAction('Lesson Completed', async () => {
      if (!state.lessonId || !state.childId) {
        throw new Error('Create child and lesson first');
      }

      return apiRequest(
        `/lessons/${state.lessonId}/complete`,
        {
          method: 'POST',
          body: JSON.stringify({
            childId: state.childId,
          }),
        },
        'parent',
      );
    });
  });

document
  .getElementById('load-progress-button')
  .addEventListener('click', () => {
    runAction('Child Progress Loaded', async () => {
      if (!state.childId) {
        throw new Error('Create child first');
      }

      return apiRequest(
        `/children/${state.childId}/progress?page=1&page_size=10`,
        {},
        'parent',
      );
    });
  });

document.getElementById('load-badges-button').addEventListener('click', () => {
  runAction('Child Badges Loaded', async () => {
    if (!state.childId) {
      throw new Error('Create child first');
    }

    return apiRequest(`/children/${state.childId}/badges`, {}, 'parent');
  });
});

document
  .getElementById('load-notifications-button')
  .addEventListener('click', () => {
    runAction('Notifications Loaded', () =>
      apiRequest('/notifications?page=1&page_size=10', {}, 'parent'),
    );
  });

document
  .getElementById('run-weekly-summary-button')
  .addEventListener('click', () => {
    runAction('Weekly Summary Job Triggered', () =>
      apiRequest(
        '/admin/jobs/run-weekly-summary',
        {
          method: 'POST',
        },
        'admin',
      ),
    );
  });

renderState();
