const apiRequest = async (url, method = 'GET', body) => {
  const options = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  return response.json();
};

const navigateTo = (url) => {
  window.location.href = url;
};

const showMessage = (elementId, text) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  }
};

const loadProfile = async () => {
  const result = await apiRequest('/api/profile');
  return result.user || null;
};

const handleRegister = async () => {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;

    const result = await apiRequest('/api/register', 'POST', { name, email, password });
    if (result.success) {
      showMessage('register-message', 'Registration successful! Redirecting to products...');
      setTimeout(() => navigateTo('products.html'), 1200);
      return;
    }
    showMessage('register-message', result.error || 'Registration failed.');
  });
};

const handleLogin = async () => {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;

    const result = await apiRequest('/api/login', 'POST', { email, password });
    if (result.success) {
      showMessage('login-message', 'Login successful! Redirecting to products...');
      setTimeout(() => navigateTo('products.html'), 900);
      return;
    }
    showMessage('login-message', result.error || 'Login failed.');
  });
};

const handleContact = async () => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    const result = await apiRequest('/api/contact', 'POST', { name, email, message });
    if (result.success) {
      showMessage('contact-message', 'Message sent successfully!');
      form.reset();
      return;
    }
    showMessage('contact-message', result.error || 'Unable to send message.');
  });
};

const renderProducts = (items, containerId) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<p>No products found. Check back later or list your own item.</p>';
    return;
  }

  container.innerHTML = items.map((product) => `
    <article class="product-card">
      <img src="${product.image}" alt="${product.title}" />
      <div class="card-body">
        <span class="tag">${product.category}</span>
        <h3>${product.title}</h3>
        <p>${product.description}</p>
        <p><strong>Price:</strong> $${Number(product.price).toFixed(2)}</p>
        <p><strong>Seller:</strong> ${product.seller_name}</p>
      </div>
    </article>
  `).join('');
};

const loadProducts = async () => {
  const categoryFilter = document.getElementById('category-filter');
  const selectedCategory = categoryFilter ? categoryFilter.value : 'All';
  const endpoint = selectedCategory && selectedCategory !== 'All'
    ? `/api/products?category=${encodeURIComponent(selectedCategory)}`
    : '/api/products';

  const result = await apiRequest(endpoint);
  renderProducts(result.products || [], 'product-list');
};

const handleProductSubmission = async () => {
  const form = document.getElementById('product-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = form.title.value.trim();
    const category = form.category.value.trim();
    const price = form.price.value.trim();
    const description = form.description.value.trim();
    const image = form.image.value.trim();

    const result = await apiRequest('/api/products', 'POST', { title, category, price, description, image });
    if (result.success) {
      showMessage('product-message', 'Product listed successfully!');
      form.reset();
      loadProducts();
      return;
    }
    showMessage('product-message', result.error || 'Unable to add product. Please log in first.');
  });
};

const showAdminDashboard = async () => {
  const profile = await loadProfile();
  const messageElement = document.getElementById('admin-message');
  if (!profile || profile.role !== 'admin') {
    if (messageElement) {
      messageElement.textContent = 'Admin access required. Please log in as the administrator.';
    }
    return;
  }

  const [stats, contacts, products, users] = await Promise.all([
    apiRequest('/api/admin/stats'),
    apiRequest('/api/admin/contacts'),
    apiRequest('/api/admin/products'),
    apiRequest('/api/admin/users')
  ]);

  const statsContainer = document.getElementById('admin-stats');
  if (statsContainer && stats.stats) {
    statsContainer.innerHTML = `
      <div class="admin-stat"><span>Products</span><strong>${stats.stats.products}</strong></div>
      <div class="admin-stat"><span>Contacts</span><strong>${stats.stats.contacts}</strong></div>
      <div class="admin-stat"><span>Direct Messages</span><strong>${stats.stats.messages}</strong></div>
      <div class="admin-stat"><span>Users</span><strong>${stats.stats.users}</strong></div>
    `;
  }

  const contactsContainer = document.getElementById('contact-messages');
  if (contactsContainer) {
    contactsContainer.innerHTML = contacts.contacts.length
      ? contacts.contacts.map((item) => `
        <div class="contact-card">
          <div class="card-body">
            <p><strong>${item.name}</strong> — ${item.email}</p>
            <p>${item.message}</p>
            <small>${item.created_at}</small>
          </div>
        </div>
      `).join('')
      : '<p>No messages yet.</p>';
  }

  const productsContainer = document.getElementById('admin-products');
  if (productsContainer) {
    productsContainer.innerHTML = products.products.length
      ? products.products.map((product) => `
        <div class="item-row">
          <div>
            <strong>${product.title}</strong> — ${product.category} • $${Number(product.price).toFixed(2)}<br />
            <small>Seller: ${product.seller_name}</small>
          </div>
          <button data-id="${product.id}">Delete</button>
        </div>
      `).join('')
      : '<p>No products available.</p>';

    productsContainer.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.id;
        await apiRequest(`/api/products/${id}`, 'DELETE');
        showAdminDashboard();
      });
    });
  }

  const usersContainer = document.getElementById('admin-users');
  if (usersContainer) {
    usersContainer.innerHTML = users.users.length
      ? users.users.map((user) => `
        <div class="item-row">
          <div>
            <strong>${user.name}</strong> • ${user.email}
          </div>
          <span>${user.role}</span>
        </div>
      `).join('')
      : '<p>No registered users yet.</p>';
  }
};

const handleMessageSubmission = async () => {
  const form = document.getElementById('message-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const subject = form.subject.value.trim();
    const body = form.body.value.trim();
    const recipient_email = form.recipient_email.value.trim();

    const result = await apiRequest('/api/messages', 'POST', { subject, body, recipient_email });
    if (result.success) {
      showMessage('message-send-result', 'Message sent successfully!');
      form.reset();
      await loadUserMessages();
      return;
    }
    showMessage('message-send-result', result.error || 'Unable to send message. Please log in first.');
  });
};

const loadUserMessages = async () => {
  const messagesList = document.getElementById('messages-list');
  if (!messagesList) return;

  const result = await apiRequest('/api/messages');
  const messages = result.messages || [];

  if (!messages.length) {
    messagesList.innerHTML = '<p>No messages yet. Start a conversation!</p>';
    return;
  }

  messagesList.innerHTML = messages.map((msg) => `
    <div class="message-item ${msg.is_read ? 'read' : 'unread'}">
      <div class="message-header">
        <strong>${msg.sender_id ? msg.sender_name : 'Admin'}</strong>
        <small>${msg.created_at}</small>
      </div>
      <p><strong>${msg.subject}</strong></p>
      <p>${msg.body}</p>
    </div>
  `).join('');
};

const showAdminMessages = async () => {
  const messagesContainer = document.getElementById('admin-messages');
  if (!messagesContainer) return;

  const result = await apiRequest('/api/admin/messages');
  const messages = result.messages || [];

  if (!messages.length) {
    messagesContainer.innerHTML = '<p>No direct messages yet.</p>';
    return;
  }

  messagesContainer.innerHTML = messages.map((msg) => `
    <div class="item-row">
      <div>
        <strong>${msg.sender_name}</strong><br />
        <strong>${msg.subject}</strong><br />
        <small>${msg.body.substring(0, 100)}...</small><br />
        <small>${msg.created_at}</small>
      </div>
    </div>
  `).join('');
};

const initializePage = async () => {
  const profile = await loadProfile();

  const authLinks = Array.from(document.querySelectorAll('nav a')).filter((link) =>
    ['Login', 'Register'].includes(link.textContent.trim())
  );

  const adminLink = Array.from(document.querySelectorAll('nav a')).find((link) => link.textContent.trim() === 'Admin');
  const sellForm = document.getElementById('product-form');
  const messagesLink = Array.from(document.querySelectorAll('nav a')).find((link) => link.textContent.trim() === 'Messages');

  if (profile) {
    authLinks.forEach((link) => link.style.display = 'none');
    if (messagesLink) messagesLink.style.display = 'inline';
    if (sellForm) {
      sellForm.querySelectorAll('input, textarea').forEach((field) => field.removeAttribute('disabled'));
      document.getElementById('product-message')?.classList.remove('message');
    }
    if (adminLink && profile.role !== 'admin') {
      adminLink.style.display = 'none';
    }
  } else {
    if (messagesLink) messagesLink.style.display = 'none';
    if (sellForm) {
      sellForm.querySelectorAll('input, textarea').forEach((field) => field.setAttribute('disabled', 'disabled'));
      showMessage('product-message', 'Please log in to list an item.');
    }
    if (adminLink) {
      adminLink.style.display = 'none';
    }
  }

  await handleRegister();
  await handleLogin();
  await handleContact();
  await handleProductSubmission();
  await handleMessageSubmission();

  const refreshButton = document.getElementById('refresh-products');
  const categoryFilter = document.getElementById('category-filter');
  if (refreshButton) refreshButton.addEventListener('click', loadProducts);
  if (categoryFilter) categoryFilter.addEventListener('change', loadProducts);

  if (document.getElementById('product-list')) {
    await loadProducts();
  }

  if (document.getElementById('messages-list')) {
    await loadUserMessages();
  }

  if (document.getElementById('admin-area')) {
    await showAdminDashboard();
    await showAdminMessages();
  }
};

initializePage();
