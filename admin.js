const $ = s => document.querySelector(s);

const API_BASE = 'https://do7u-backend.onrender.com';

let kind = 'activities';
let content = {
  activities: [],
  projects: []
};

// Échapper les caractères HTML pour éviter l'injection de contenu.
function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// Communiquer avec le backend.
async function api(url, body) {
  const options = {
    method: body !== undefined ? 'POST' : 'GET',
    credentials: 'include',
    headers: {}
  };

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${url}`, options);

  const data = await response.json().catch(() => ({
    error: 'Réponse serveur invalide.'
  }));

  if (!response.ok) {
    throw new Error(data.error || `Erreur HTTP ${response.status}.`);
  }

  return data;
}

// Afficher le tableau de bord.
function showDashboard() {
  $('#loginPanel').classList.add('hidden');
  $('#dashboard').classList.remove('hidden');
  refresh();
}

// Vérifier si une session administrateur existe.
async function check() {
  try {
    await api('/api/admin/check');
    showDashboard();
  } catch (error) {
    $('#dashboard').classList.add('hidden');
    $('#loginPanel').classList.remove('hidden');
  }
}

// Connexion administrateur.
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();

  $('#loginError').textContent = '';

  const form = new FormData(e.currentTarget);

  try {
    await api('/api/login', {
      username: form.get('username'),
      password: form.get('password')
    });

    showDashboard();
  } catch (error) {
    $('#loginError').textContent =
      error.message || 'Impossible de se connecter.';
  }
});

// Déconnexion.
$('#logout').addEventListener('click', async () => {
  try {
    await api('/api/logout', {});
  } catch (error) {
    console.error('Erreur de déconnexion :', error);
  }

  $('#dashboard').classList.add('hidden');
  $('#loginPanel').classList.remove('hidden');
  $('#loginForm').reset();
});

// Changer entre activités et projets.
document.querySelectorAll('.tab').forEach(button => {
  button.addEventListener('click', () => {
    kind = button.dataset.kind;

    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab === button);
    });

    $('input[name="kind"]').value = kind;

    $('#formTitle').textContent =
      kind === 'activities' ? 'Nouvelle activité' : 'Nouveau projet';

    const dateLabel = $('label:has(input[name="date"])');

    if (dateLabel) {
      dateLabel.style.display =
        kind === 'activities' ? 'grid' : 'none';
    }

    resetForm();
    renderList();
  });
});

// Réinitialiser le formulaire.
function resetForm() {
  $('#contentForm').reset();

  $('input[name="id"]').value = '';
  $('input[name="kind"]').value = kind;

  $('#formTitle').textContent =
    kind === 'activities' ? 'Nouvelle activité' : 'Nouveau projet';

  $('#saveMessage').textContent = '';

  const dateLabel = $('label:has(input[name="date"])');

  if (dateLabel) {
    dateLabel.style.display =
      kind === 'activities' ? 'grid' : 'none';
  }
}

$('#resetForm').addEventListener('click', resetForm);

// Charger les activités et les projets depuis le backend.
async function refresh() {
  const list = $('#manageList');

  list.textContent = 'Chargement des contenus...';

  try {
    const data = await api('/api/content');

    // Le backend renvoie directement { activities, projects }.
    content = {
      activities: Array.isArray(data.activities)
        ? data.activities
        : [],
      projects: Array.isArray(data.projects)
        ? data.projects
        : []
    };

    renderList();
  } catch (error) {
    list.textContent =
      `Impossible de charger les contenus : ${error.message}`;
  }
}

// Afficher la liste des contenus.
function renderList() {
  const arr = content[kind] || [];

  $('#manageList').innerHTML = arr.length
    ? arr.map(item => `
        <article class="manage-item">
          <div>
            <b>${esc(item.title)}</b>
            <p>
              ${esc(item.category || 'Sans catégorie')}
              ·
              ${esc(item.date || 'Projet')}
            </p>
            <small>
              ${esc((item.description || '').slice(0, 130))}
            </small>
          </div>

          <div class="manage-actions">
            <button
              type="button"
              data-edit="${esc(item.id)}"
              class="mini-btn">
              Modifier
            </button>

            <button
              type="button"
              data-delete="${esc(item.id)}"
              class="mini-btn danger">
              Supprimer
            </button>
          </div>
        </article>
      `).join('')
    : '<p>Aucun contenu pour le moment.</p>';
}

// Modifier ou supprimer un contenu.
$('#manageList').addEventListener('click', async e => {
  const edit = e.target.dataset.edit;
  const del = e.target.dataset.delete;

  if (edit !== undefined) {
    const item = content[kind].find(
      entry => String(entry.id) === String(edit)
    );

    if (!item) return;

    for (const key of [
      'id',
      'title',
      'category',
      'date',
      'image',
      'description'
    ]) {
      const element = $(`[name="${key}"]`);

      if (element) {
        element.value = item[key] ?? '';
      }
    }

    $('input[name="kind"]').value = kind;
    $('#formTitle').textContent = `Modifier : ${item.title}`;
    $('#saveMessage').textContent = '';

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  if (
    del !== undefined &&
    confirm('Supprimer ce contenu ? Cette action est irréversible.')
  ) {
    try {
      const data = await api('/api/admin/delete', {
        kind,
        id: Number(del)
      });

      content = {
        activities: Array.isArray(data.content?.activities)
          ? data.content.activities
          : content.activities,
        projects: Array.isArray(data.content?.projects)
          ? data.content.projects
          : content.projects
      };

      renderList();
      $('#saveMessage').textContent = 'Contenu supprimé.';
    } catch (error) {
      alert(`Suppression impossible : ${error.message}`);
    }
  }
});

// Ajouter ou enregistrer les modifications d'un contenu.
$('#contentForm').addEventListener('submit', async e => {
  e.preventDefault();

  $('#saveMessage').textContent = 'Enregistrement en cours...';

  const form = new FormData(e.currentTarget);
  const body = Object.fromEntries(form.entries());

  body.kind = kind;

  try {
    const data = await api('/api/admin/save', body);

    content = {
      activities: Array.isArray(data.content?.activities)
        ? data.content.activities
        : content.activities,
      projects: Array.isArray(data.content?.projects)
        ? data.content.projects
        : content.projects
    };

    resetForm();
    renderList();

    $('#saveMessage').textContent =
      'Publication enregistrée avec succès.';
  } catch (error) {
    $('#saveMessage').textContent =
      `Échec de l'enregistrement : ${error.message}`;
  }
});

// Vérifier la session au chargement de la page.
check();
