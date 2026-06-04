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
        <div class="user-row">
          <div class="user-header" data-id="${user.id}" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>${user.name}</strong>
              <div style="font-size:0.85em; color:#666;">${new Date(user.created_at).toLocaleString()}</div>
              <div style="font-size:0.85em; color:#444;">${user.email}</div>
            </div>
            <div><small>${user.role}</small></div>
          </div>
          <div class="user-details" id="user-details-${user.id}" style="display:none; padding:8px 12px; border-left:2px solid #eee; margin:6px 0;">
            <p><strong>ID:</strong> ${user.id}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Role:</strong> ${user.role}</p>
            <p><strong>Joined:</strong> ${new Date(user.created_at).toLocaleString()}</p>
            <div id="user-history-${user.id}"></div>
            <button id="user-history-btn-${user.id}">Load full history</button>
          </div>
        </div>
      `).join('')
      : '<p>No registered users yet.</p>';

    // Attach toggle handlers for expanding user details and fetching user messages
    usersContainer.querySelectorAll('.user-header').forEach((header) => {
      header.addEventListener('click', async () => {
        const id = header.dataset.id;
        const details = document.getElementById(`user-details-${id}`);
        if (!details) return;

        // If details not loaded yet, fetch user details from server
        if (details.dataset.loaded !== 'true') {
          details.innerHTML = '<p>Loading user details...</p>';
          try {
            const result = await apiRequest(`/api/admin/users/${id}`);
            if (result.user) {
              details.innerHTML = `
                <p><strong>ID:</strong> ${result.user.id}</p>
                <p><strong>Email:</strong> ${result.user.email}</p>
                <p><strong>Role:</strong> ${result.user.role}</p>
              `;

              if (result.messages && result.messages.length) {
                details.innerHTML += '<h4>Messages</h4>' + result.messages.slice(0,10).map((m) => `
                  <div class="user-message">
                    <p><strong>${m.subject}</strong></p>
                    <p>${m.body.substring(0,120)}${m.body.length>120? '...':''}</p>
                    <small>From: ${m.sender_name || 'N/A'} • To: ${m.recipient_email || 'N/A'} • ${m.created_at}</small>
                  </div>
                `).join('');
              } else {
                details.innerHTML += '<p>No messages for this user.</p>';
              }
              // Attach history loader
              const histBtn = document.getElementById(`user-history-btn-${id}`);
              if (histBtn) {
                histBtn.addEventListener('click', async (e) => {
                  e.stopPropagation();
                  const histDiv = document.getElementById(`user-history-${id}`);
                  if (!histDiv) return;
                  if (histDiv.dataset.loaded === 'true') return;
                  histDiv.innerHTML = '<p>Loading history...</p>';
                  try {
                    const h = await apiRequest(`/api/admin/users/${id}/history`);
                    histDiv.innerHTML = `
                      <h5>Products (${h.products.length})</h5>
                      ${h.products.length ? h.products.map(p => `<div><strong>${p.title}</strong> — $${Number(p.price).toFixed(2)}<br/><small>${p.created_at}</small></div>`).join('') : '<p>No products.</p>'}
                      <h5>Contacts (${h.contacts.length})</h5>
                      ${h.contacts.length ? h.contacts.map(c => `<div><strong>${c.name}</strong> — ${c.email}<p>${c.message}</p><small>${c.created_at}</small></div>`).join('') : '<p>No contact messages.</p>'}
                      <h5>Messages (${h.messages.length})</h5>
                      ${h.messages.length ? h.messages.map(m => `<div><strong>${m.subject}</strong><p>${m.body.substring(0,120)}${m.body.length>120? '...':''}</p><small>${m.created_at}</small></div>`).join('') : '<p>No messages.</p>'}
                    `;
                    histDiv.dataset.loaded = 'true';
                  } catch (err) {
                    histDiv.innerHTML = '<p>Error loading history.</p>';
                  }
                });
              }
            } else {
              details.innerHTML = `<p>Error loading user: ${result.error || 'Unknown'}</p>`;
            }
          } catch (e) {
            details.innerHTML = `<p>Error fetching user details.</p>`;
          }
          details.dataset.loaded = 'true';
        }

        details.style.display = details.style.display === 'none' ? 'block' : 'none';
      });
    });
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

const showBackendConsole = async () => {
  const profile = await loadProfile();
  const messageElement = document.getElementById('backend-message');
  if (!profile || profile.role !== 'admin') {
    if (messageElement) {
      messageElement.textContent = 'Admin access required. Please log in as the administrator.';
    }
    return;
  }

  const [stats, contacts, products, users, messages] = await Promise.all([
    apiRequest('/api/admin/stats'),
    apiRequest('/api/admin/contacts'),
    apiRequest('/api/admin/products'),
    apiRequest('/api/admin/users'),
    apiRequest('/api/admin/messages')
  ]);

  const statsContainer = document.getElementById('backend-stats');
  if (statsContainer && stats.stats) {
    statsContainer.innerHTML = `
      <div class="admin-stat"><span>Products</span><strong>${stats.stats.products}</strong></div>
      <div class="admin-stat"><span>Contacts</span><strong>${stats.stats.contacts}</strong></div>
      <div class="admin-stat"><span>Messages</span><strong>${stats.stats.messages}</strong></div>
      <div class="admin-stat"><span>Users</span><strong>${stats.stats.users}</strong></div>
    `;
  }

  const backendData = document.getElementById('backend-data');
  if (!backendData) return;

  backendData.innerHTML = `
    <div class="admin-panel"><h3>Latest contacts</h3>
      ${contacts.contacts.length ? contacts.contacts.slice(0, 5).map((item) => `
        <div class="message-item read">
          <div class="message-header"><strong>${item.name}</strong><small>${item.created_at}</small></div>
          <p>${item.message}</p>
          <p><small>${item.email}</small></p>
        </div>
      `).join('') : '<p>No contact messages yet.</p>'}
    </div>
    <div class="admin-panel"><h3>Latest products</h3>
      ${products.products.length ? products.products.slice(0, 5).map((product) => `
        <div class="message-item read">
          <p><strong>${product.title}</strong> — ${product.category}</p>
          <p>$${Number(product.price).toFixed(2)}</p>
          <p><small>Seller: ${product.seller_name}</small></p>
        </div>
      `).join('') : '<p>No products available.</p>'}
    </div>
    <div class="admin-panel"><h3>Users</h3>
      ${users.users.length ? users.users.map((user) => `
        <div class="message-item read">
          <p><strong>${user.name}</strong> — ${user.role}</p>
          <p><small>${user.email}</small></p>
        </div>
      `).join('') : '<p>No registered users yet.</p>'}
    </div>
    <div class="admin-panel"><h3>Direct messages</h3>
      ${messages.messages.length ? messages.messages.slice(0, 5).map((msg) => `
        <div class="message-item read">
          <div class="message-header"><strong>${msg.sender_name}</strong><small>${msg.created_at}</small></div>
          <p><strong>${msg.subject}</strong></p>
          <p>${msg.body.substring(0, 120)}...</p>
          <p><small>To: ${msg.recipient_email}</small></p>
        </div>
      `).join('') : '<p>No direct messages yet.</p>'}
    </div>
  `;
};

const initializePage = async () => {
  const profile = await loadProfile();

  const authLinks = Array.from(document.querySelectorAll('nav a')).filter((link) =>
    ['Login', 'Register'].includes(link.textContent.trim())
  );

  const adminLink = Array.from(document.querySelectorAll('nav a')).find((link) => link.textContent.trim() === 'Admin');
  const backendLink = Array.from(document.querySelectorAll('nav a')).find((link) => link.textContent.trim() === 'Backend');
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
    if (backendLink) {
      backendLink.style.display = profile.role === 'admin' ? 'inline' : 'none';
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
    if (backendLink) {
      backendLink.style.display = 'none';
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

  if (document.getElementById('backend-data')) {
    await showBackendConsole();
  }
};

initializePage();
