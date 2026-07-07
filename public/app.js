// State
let items = [];
let users = {};
let currentUser = localStorage.getItem('sem_bazaar_token') ? parseJwt(localStorage.getItem('sem_bazaar_token')).email : null;
let requests = [];
let sessions = JSON.parse(localStorage.getItem('sem_bazaar_sessions_v3')) || [];
let activeCategory = 'All';
let currentTheme = localStorage.getItem('sem_bazaar_theme') || 'dark';
let isRegistering = false;
let editingItemId = null;

const API_URL = '/api';

function parseJwt (token) {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem('sem_bazaar_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// DOM Elements
const listingsGrid = document.getElementById('listingsGrid');
const categoryTitle = document.getElementById('categoryTitle');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const categoryList = document.getElementById('categoryList');

const loginBtn = document.getElementById('loginBtn');
const sellBtn = document.getElementById('sellBtn');
const userProfile = document.getElementById('userProfile');
const themeToggle = document.getElementById('themeToggle');

// Initialization
async function init() {
  applyTheme();
  
  if (currentUser) {
      await fetchUserData(currentUser);
  }
  
  updateAuthUI();
  await fetchItems();
  
  // Event Listeners
  searchInput.addEventListener('input', renderListings);
  sortSelect.addEventListener('change', renderListings);
  
  categoryList.addEventListener('click', (e) => {
    if(e.target.tagName === 'LI') {
      document.querySelectorAll('.category-list li').forEach(li => li.classList.remove('active'));
      e.target.classList.add('active');
      activeCategory = e.target.getAttribute('data-cat');
      categoryTitle.textContent = activeCategory === 'All' ? 'All Items' : activeCategory;
      renderListings();
    }
  });

  document.getElementById('sellForm').addEventListener('submit', handleSell);
  document.getElementById('doLoginBtn').addEventListener('click', handleLogin);
  document.getElementById('doSignupBtn').addEventListener('click', handleSignup);
  loginBtn.addEventListener('click', () => openModal('loginModal'));
  
  userProfile.addEventListener('click', openProfile);
  
  sellBtn.addEventListener('click', () => {
    if(!currentUser) {
      alert("Please login first to sell an item.");
      openModal('loginModal');
    } else {
      editingItemId = null;
      document.getElementById('sellModalTitle').textContent = "List an Item";
      document.getElementById('sellSubmitBtn').textContent = "Publish Listing";
      document.getElementById('sellImage').required = true;
      document.getElementById('sellForm').reset();
      openModal('sellModal');
    }
  });

  themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('sem_bazaar_theme', currentTheme);
    applyTheme();
  });
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  themeToggle.textContent = currentTheme === 'dark' ? '🌞' : '🌙';
}

function updateAuthUI() {
  if(currentUser && users[currentUser]) {
    loginBtn.classList.add('hidden');
    userProfile.classList.remove('hidden');
    userProfile.textContent = `Hi, ${users[currentUser].name}`;
  } else {
    loginBtn.classList.remove('hidden');
    userProfile.classList.add('hidden');
  }
}

// Utility for image upload
function fileToBase64(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    callback(e.target.result);
  };
  reader.readAsDataURL(file);
}

async function fetchUserData(email) {
    if (users[email]) return;
    try {
        const res = await fetch(`${API_URL}/users/${email}`, { headers: getAuthHeaders() });
        if (res.ok) {
            const user = await res.json();
            users[email] = user;
        }
    } catch (e) {
        console.error('Error fetching user data', e);
    }
}

async function fetchItems() {
    try {
        const res = await fetch(`${API_URL}/items`);
        if (res.ok) {
            items = await res.json();
            renderListings();
        }
    } catch (e) {
        console.error('Error fetching items', e);
    }
}

async function fetchRequests() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_URL}/requests`, { headers: getAuthHeaders() });
        if (res.ok) {
            requests = await res.json();
        }
    } catch (e) {
        console.error('Error fetching requests', e);
    }
}

function toggleAuthMode(mode) {
  const loginSection = document.getElementById('loginSection');
  const signupSection = document.getElementById('signupSection');
  
  if (mode === 'signup') {
    loginSection.classList.add('hidden');
    signupSection.classList.remove('hidden');
  } else {
    signupSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
  }
}

async function handleLogin() {
  const username = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorMsg = document.getElementById('loginError');
  
  if(!username || !password) {
      alert("Please enter both email and password.");
      return;
  }

  if(username.endsWith('@rvce.edu.in')) {
    if(errorMsg) errorMsg.style.display = 'none';
    
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: username, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('sem_bazaar_token', data.token);
            currentUser = username;
            users[username] = data.user;
            
            if (!sessions.find(s => s.email === currentUser)) {
                sessions.push({ email: currentUser, token: data.token });
                localStorage.setItem('sem_bazaar_sessions_v3', JSON.stringify(sessions));
            }
            
            updateAuthUI();
            await fetchItems();
            await fetchRequests();
            closeModal('loginModal');
            openModal('welcomeModal');
        } else {
            alert(data.error);
        }
    } catch (e) {
        alert('Server error during login.');
    }
  } else {
    if(errorMsg) errorMsg.style.display = 'block';
    else alert('Only @rvce.edu.in email addresses are allowed.');
  }
}

async function handleSignup() {
  const username = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const errorMsg = document.getElementById('regError');
  
  if(!username || !password) {
      alert("Please enter both email and password.");
      return;
  }

  if(username.endsWith('@rvce.edu.in')) {
    if(errorMsg) errorMsg.style.display = 'none';
    
    const name = document.getElementById('regName').value.trim();
    const usn = document.getElementById('regUSN').value.trim();
    const branch = document.getElementById('regBranch').value;
    const logoFile = document.getElementById('regLogo').files[0];
    const phone = document.getElementById('regPhone').value.trim();
    const address = document.getElementById('regAddress').value.trim();
    
    if(!name || !usn || !logoFile) {
      alert('Please fill all name, USN, and profile logo fields.');
      return;
    }
    
    fileToBase64(logoFile, async (base64) => {
      try {
          const res = await fetch(`${API_URL}/auth/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: username, password, name, usn, branch, phone, address, logo: base64 })
          });
          const data = await res.json();
          if (res.ok) {
              localStorage.setItem('sem_bazaar_token', data.token);
              currentUser = username;
              users[username] = data;
              
              if (!sessions.find(s => s.email === currentUser)) {
                  sessions.push({ email: currentUser, token: data.token });
                  localStorage.setItem('sem_bazaar_sessions_v3', JSON.stringify(sessions));
              }
              
              updateAuthUI();
              await fetchItems();
              await fetchRequests();
              closeModal('loginModal');
              openModal('welcomeModal');
          } else {
              alert(data.error);
          }
      } catch (e) {
          alert('Server error during registration.');
      }
    });
  } else {
    if(errorMsg) errorMsg.style.display = 'block';
    else alert('Only @rvce.edu.in email addresses are allowed.');
  }
}

function selectAction(action) {
  closeModal('welcomeModal');
  if(action === 'sell') {
    openModal('sellModal');
  }
}

async function openProfile() {
  if(!currentUser || !users[currentUser]) return;
  
  // ensure we have latest requests
  await fetchRequests();
  
  const user = users[currentUser];
  
  document.getElementById('profileLogoDisplay').src = user.logo;
  document.getElementById('profileNameDisplay').textContent = user.name;
  document.getElementById('profileUSNDisplay').textContent = user.usn;
  document.getElementById('profileBranchDisplay').textContent = user.branch;
  
  // Render user's items
  const userItems = items.filter(i => i.sellerEmail === currentUser);
  const listContainer = document.getElementById('profileItemsList');
  listContainer.innerHTML = '';
  
  if(userItems.length === 0) {
    listContainer.innerHTML = '<p style="color:var(--text-secondary);font-size:14px;">You have no items enlisted.</p>';
  } else {
    userItems.forEach(item => {
      listContainer.innerHTML += `
        <div style="display:flex; gap:10px; padding:10px; background:var(--input-bg); border-radius:8px; border:1px solid var(--border-color); align-items:center;">
          <img src="${item.image}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">
          <div style="flex:1; min-width: 0;">
            <div style="font-weight:600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</div>
            <div style="color:var(--accent-color); font-size:14px;">₹${item.price}</div>
          </div>
          <div style="display: flex; gap: 5px;">
            <button class="btn btn-outline" style="padding: 5px 10px; font-size: 13px;" onclick="closeModal('profileModal'); openEditModal(${item.id})">Edit</button>
            <button class="btn btn-primary" style="padding: 5px 10px; font-size: 13px; background: var(--danger); border-color: var(--danger);" onclick="deleteItem(${item.id})">Remove</button>
          </div>
        </div>
      `;
    });
  }
  
  // Render requests received
  const myItemIds = new Set(userItems.map(i => i.id));
  const myRequests = requests.filter(r => myItemIds.has(r.itemId));
  const requestsContainer = document.getElementById('profileRequestsList');
  requestsContainer.innerHTML = '';
  
  if (myRequests.length === 0) {
    requestsContainer.innerHTML = '<p style="color:var(--text-secondary);font-size:14px;">No requests received yet.</p>';
  } else {
    for (const req of myRequests) {
      if (!users[req.buyerEmail]) await fetchUserData(req.buyerEmail);
      const buyerUser = users[req.buyerEmail] || {};
      const buyerPhone = buyerUser.phone || 'Not provided';
      
      const isAccepted = req.status === 'accepted';
      const itemHasAcceptedRequest = requests.some(r => r.itemId === req.itemId && r.status === 'accepted');
      
      requestsContainer.innerHTML += `
        <div class="request-card" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
            <div>
              <div style="font-weight: 600; font-size: 14px;">Item: ${req.itemTitle}</div>
              <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
                Buyer: <strong>${req.buyerName}</strong> (${req.buyerBranch} • ${req.buyerUsn})
              </div>
            </div>
            <div>
              <span class="badge ${isAccepted ? 'badge-accepted' : 'badge-pending'}">${req.status}</span>
            </div>
          </div>
          
          ${isAccepted ? `
            <div style="font-size: 13px; padding: 10px; background: var(--input-bg); border-radius: 6px; border: 1px solid var(--border-color); margin-top: 4px;">
              <div style="margin-bottom: 4px;"><strong>Email:</strong> ${req.buyerEmail}</div>
              <div><strong>Phone:</strong> ${buyerPhone}</div>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; text-align: right;">
              Shared contact: ${user.phone || 'Not provided'} • ${user.address || 'Not provided'}
            </div>
          ` : `
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; font-style: italic;">
              Contact details will be visible once you accept the request.
            </div>
            <div style="display: flex; gap: 8px; margin-top: 4px; align-items: center; flex-wrap: wrap;">
              ${itemHasAcceptedRequest ? `
                <span style="font-size: 12px; color: var(--danger); font-weight: 600;">Temporarily Sold to Another Buyer</span>
              ` : `
                <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px; height: auto;" onclick="acceptRequest(${req.requestId})">Accept Request</button>
              `}
            </div>
          `}
        </div>
      `;
    }
  }
  
  // Render active session list
  const sessionAccountsList = document.getElementById('sessionAccountsList');
  if (sessionAccountsList) {
    let sessionsHTML = '';
    for (const session of sessions) {
      if (!users[session.email]) await fetchUserData(session.email);
      const u = users[session.email];
      if (!u) continue;
      const isActive = session.email === currentUser;
      sessionsHTML += `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 8px; background: ${isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent'}; border-radius: 6px; border: 1px solid ${isActive ? 'var(--accent-color)' : 'transparent'};">
          <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
            <img src="${u.logo}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; background: var(--bg-tertiary);">
            <div style="font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;">
              ${u.name} <span style="font-size: 11px; color: var(--text-secondary); display: block;">${session.email}</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 5px;">
            ${isActive ? `
              <span style="font-size: 11px; color: var(--accent-color); font-weight: 600; padding: 2px 6px;">Active</span>
            ` : `
              <button class="btn btn-outline" style="padding: 3px 8px; font-size: 11px; height: auto;" onclick="switchAccount('${session.email}')">Switch</button>
              <button style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 16px; padding: 2px 6px;" onclick="removeSession('${session.email}')" title="Logout Account">&times;</button>
            `}
          </div>
        </div>
      `;
    }
    sessionAccountsList.innerHTML = sessionsHTML || '<p style="color:var(--text-secondary);font-size:12px;">No other accounts saved.</p>';
  }
  
  openModal('profileModal');
}

function openEditModal(id) {
  const item = items.find(i => i.id === id);
  if(!item) return;

  editingItemId = id;
  document.getElementById('sellModalTitle').textContent = "Edit Listing";
  document.getElementById('sellSubmitBtn').textContent = "Save Changes";
  document.getElementById('sellImage').required = false;

  // Fill form
  document.getElementById('sellTitle').value = item.title;
  document.getElementById('sellCategory').value = item.category;
  document.getElementById('sellPrice').value = item.price;
  document.getElementById('sellCondition').value = item.condition;
  document.getElementById('sellDesc').value = item.description;

  openModal('sellModal');
}

async function deleteItem(id) {
  if (confirm("Are you sure you want to remove this listing? This action cannot be undone.")) {
    try {
        const res = await fetch(`${API_URL}/items/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            await fetchItems();
            
            // Close detail modal if it's open for the deleted item
            closeModal('detailModal');
            
            // Refresh the profile modal if it's open
            if(document.getElementById('profileModal').classList.contains('active')) {
              openProfile();
            }
        } else {
            alert('Failed to delete item.');
        }
    } catch (e) {
        alert('Server error.');
    }
  }
}

function logout() {
  if (currentUser) {
    sessions = sessions.filter(s => s.email !== currentUser);
    localStorage.setItem('sem_bazaar_sessions_v3', JSON.stringify(sessions));
  }
  
  if (sessions.length > 0) {
    const session = sessions[0];
    currentUser = session.email;
    localStorage.setItem('sem_bazaar_token', session.token);
    alert("Logged out of this account. Switched to your other account.");
    updateAuthUI();
    renderListings();
    openProfile();
  } else {
    currentUser = null;
    localStorage.removeItem('sem_bazaar_token');
    updateAuthUI();
    renderListings();
    closeModal('profileModal');
    alert("You have been logged out. No active sessions remaining.");
  }
}

async function handleSell(e) {
  e.preventDefault();
  const title = document.getElementById('sellTitle').value;
  const category = document.getElementById('sellCategory').value;
  const price = document.getElementById('sellPrice').value;
  const condition = document.getElementById('sellCondition').value;
  const desc = document.getElementById('sellDesc').value;
  const file = document.getElementById('sellImage').files[0];

  const saveChanges = async (base64Image) => {
    try {
        if (editingItemId !== null) {
          // Editing mode
          const body = { title, category, price: parseInt(price), condition, description: desc };
          if (base64Image) body.image = base64Image;
          
          await fetch(`${API_URL}/items/${editingItemId}`, {
              method: 'PUT',
              headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
          });
          editingItemId = null;
        } else {
          // Creating mode
          const body = { title, category, price: parseInt(price), condition, description: desc, image: base64Image };
          await fetch(`${API_URL}/items`, {
              method: 'POST',
              headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
          });
        }
        await fetchItems();
        closeModal('sellModal');
        e.target.reset();
    } catch (err) {
        alert("Failed to save item");
    }
  };

  if (file) {
    fileToBase64(file, (base64) => {
      saveChanges(base64);
    });
  } else {
    if (editingItemId === null) {
      alert("Please upload a photo of the object.");
      return;
    }
    saveChanges(null);
  }
}

function renderListings() {
  const query = searchInput.value.toLowerCase();
  const sort = sortSelect.value;
  
  let filtered = items.filter(item => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch = item.title.toLowerCase().includes(query) || item.description.toLowerCase().includes(query);
    return matchCat && matchSearch;
  });

  if(sort === 'price-low') {
    filtered.sort((a,b) => a.price - b.price);
  } else if(sort === 'price-high') {
    filtered.sort((a,b) => b.price - a.price);
  } else {
    filtered.sort((a,b) => b.date - a.date);
  }

  listingsGrid.innerHTML = '';
  
  if(filtered.length === 0) {
    listingsGrid.innerHTML = `<p style="color:var(--text-secondary); grid-column: 1/-1;">No items found.</p>`;
    return;
  }

  filtered.forEach(item => {
    const sellerDisplay = item.sellerName || item.seller || 'Unknown User';
    const isOwner = currentUser && item.sellerEmail === currentUser;
    const isSold = requests.some(r => r.itemId === item.id && r.status === 'accepted');
    
    const card = document.createElement('div');
    card.className = 'product-card glass-panel';
    card.innerHTML = `
      <div class="category-badge">${item.category}</div>
      ${isSold ? `<div class="category-badge" style="background: var(--danger); right: auto; left: 10px;">Temporarily Sold</div>` : ''}
      <img src="${item.image}" alt="${item.title}" class="product-image" ${isSold ? 'style="filter: grayscale(80%) opacity(60%);"' : ''}>
      <div class="product-details">
        <div class="product-title">${item.title}</div>
        <div class="product-price">₹${item.price}</div>
        <div class="product-meta">
          <span>${item.condition}</span>
          <span>${sellerDisplay}</span>
        </div>
        <div style="display: flex; gap: 8px; margin-top: auto; padding-top: 10px; width: 100%;">
          <button class="btn btn-primary view-btn" style="flex: 1;" onclick="openDetail(${item.id})">View Details</button>
          ${isOwner ? `<button class="btn btn-outline" style="padding: 0 12px; display: flex; align-items: center; justify-content: center; height: 38px; border-radius: 8px;" onclick="openEditModal(${item.id})" title="Edit Item">✏️</button>` : ''}
        </div>
      </div>
    `;
    listingsGrid.appendChild(card);
  });
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  // Specific resets
  if(id === 'loginModal') {
    toggleAuthMode('login'); // Reset to login view
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').style.display = 'none';
    
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regName').value = '';
    document.getElementById('regUSN').value = '';
    document.getElementById('regPhone').value = '';
    document.getElementById('regAddress').value = '';
    document.getElementById('regError').style.display = 'none';
  }
  if(id === 'sellModal') {
    editingItemId = null;
    document.getElementById('sellForm').reset();
    document.getElementById('sellModalTitle').textContent = "List an Item";
    document.getElementById('sellSubmitBtn').textContent = "Publish Listing";
    document.getElementById('sellImage').required = true;
  }
}

async function openDetail(id) {
  const item = items.find(i => i.id === id);
  if(!item) return;

  const sellerDisplay = item.sellerName || item.seller || 'Unknown User';

  document.getElementById('detailImg').src = item.image;
  document.getElementById('detailTitle').textContent = item.title;
  document.getElementById('detailPrice').textContent = `₹${item.price}`;
  
  if (!users[item.sellerEmail]) await fetchUserData(item.sellerEmail);
  const seller = users[item.sellerEmail];
  
  const profileContainer = document.getElementById('detailSellerProfile');
  if(seller && profileContainer) {
    profileContainer.style.display = 'flex';
    document.getElementById('detailSellerLogo').src = seller.logo;
    document.getElementById('detailSellerName').textContent = seller.name;
    document.getElementById('detailSellerDetails').textContent = `${seller.branch} • ${seller.usn}`;
  } else if (profileContainer) {
    profileContainer.style.display = 'flex';
    document.getElementById('detailSellerLogo').src = '';
    document.getElementById('detailSellerName').textContent = sellerDisplay;
    document.getElementById('detailSellerDetails').textContent = 'User details unavailable';
  }

  document.getElementById('detailDesc').textContent = item.description;
  document.getElementById('detailCondition').textContent = `Condition: ${item.condition}`;
  
  const interestBtn = document.getElementById('detailInterestBtn');
  const editBtn = document.getElementById('detailEditBtn');
  const contactHeader = document.getElementById('detailContactHeader');
  const emailContainer = document.getElementById('detailEmailContainer');
  const sellerEmailDisplay = document.getElementById('detailSellerEmailDisplay');
  const copyEmailBtn = document.getElementById('copyEmailBtn');
  const statusContainer = document.getElementById('detailRequestStatusContainer');
  
  const isOwner = currentUser && item.sellerEmail === currentUser;
  
  await fetchRequests(); // Ensure we have latest requests
  const isSold = requests.some(r => r.itemId === item.id && r.status === 'accepted');
  const myReq = currentUser ? requests.find(r => r.itemId === item.id && r.buyerEmail === currentUser) : null;
  const isAcceptedBySeller = myReq && myReq.status === 'accepted';

  // Reset elements
  if (statusContainer) {
    statusContainer.style.display = 'none';
    statusContainer.innerHTML = '';
  }
  if (interestBtn) {
    interestBtn.style.display = 'none';
    interestBtn.disabled = false;
    interestBtn.style.opacity = '1';
    interestBtn.style.cursor = 'pointer';
  }
  if (emailContainer) emailContainer.style.display = 'none';
  if (editBtn) editBtn.style.display = 'none';

  if (isOwner) {
    if (editBtn) {
      editBtn.style.display = 'inline-block';
      editBtn.onclick = () => {
        closeModal('detailModal');
        openEditModal(item.id);
      };
    }
    if (contactHeader) {
      contactHeader.innerHTML = `You own this listing. <a href="#" style="color: var(--danger); font-size: 14px; margin-left: 10px;" onclick="deleteItem(${item.id})">Delete Listing</a>`;
    }
  } else {
    if (contactHeader) contactHeader.textContent = "Interested in this item?";
    
    // Show email copy box
    if (isAcceptedBySeller && emailContainer && sellerEmailDisplay) {
      emailContainer.style.display = 'flex';
      sellerEmailDisplay.textContent = item.sellerEmail || 'No email';
      
      if (copyEmailBtn) {
        copyEmailBtn.onclick = () => {
          navigator.clipboard.writeText(item.sellerEmail || '').then(() => {
            copyEmailBtn.textContent = 'Copied!';
            setTimeout(() => {
              copyEmailBtn.textContent = 'Copy Email';
            }, 2000);
          });
        };
      }
    }
    
    if (interestBtn) {
      interestBtn.style.display = 'inline-block';
      
      if (!currentUser) {
        if (isSold) {
          interestBtn.textContent = "Temporarily Sold";
          interestBtn.disabled = true;
          interestBtn.style.opacity = '0.7';
          interestBtn.style.cursor = 'not-allowed';
        } else {
          interestBtn.textContent = "I'm Interested";
          interestBtn.onclick = () => {
            closeModal('detailModal');
            alert("Please login first to send an interest request.");
            openModal('loginModal');
          };
        }
      } else {
        // Logged in buyer
        if (isSold) {
          if (isAcceptedBySeller) {
            interestBtn.textContent = "Request Accepted";
            interestBtn.disabled = true;
            interestBtn.style.opacity = '0.7';
            interestBtn.style.cursor = 'not-allowed';
            interestBtn.onclick = null;
            
            if (statusContainer) {
              statusContainer.style.display = 'block';
              const sellerUser = users[item.sellerEmail] || {};
              statusContainer.innerHTML = `
                <div style="margin-top: 15px; padding: 12px; border-radius: 8px; background: rgba(16, 185, 129, 0.1); border: 1px solid var(--success); text-align: left;">
                  <div style="font-weight: 600; color: var(--success); margin-bottom: 6px;">✓ Request Accepted! Contact details revealed:</div>
                  <div style="margin-bottom: 4px;"><strong>Phone:</strong> ${sellerUser.phone || 'Not provided'}</div>
                  <div><strong>Hostel/Address:</strong> ${sellerUser.address || 'Not provided'}</div>
                </div>
              `;
            }
          } else {
            interestBtn.textContent = "Temporarily Sold";
            interestBtn.disabled = true;
            interestBtn.style.opacity = '0.7';
            interestBtn.style.cursor = 'not-allowed';
            interestBtn.onclick = null;
            
            if (statusContainer) {
              statusContainer.style.display = 'block';
              statusContainer.innerHTML = `
                <div style="margin-top: 15px; padding: 12px; border-radius: 8px; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger); text-align: left; color: var(--text-secondary); font-size: 13px;">
                  This item has been temporarily sold to another student.
                </div>
              `;
            }
          }
        } else {
          // Not sold yet
          if (myReq) {
            interestBtn.textContent = "Request Sent";
            interestBtn.disabled = true;
            interestBtn.style.opacity = '0.7';
            interestBtn.style.cursor = 'not-allowed';
            interestBtn.onclick = null;
            
            if (statusContainer) {
              statusContainer.style.display = 'block';
              statusContainer.innerHTML = `
                <div style="margin-top: 15px; padding: 12px; border-radius: 8px; background: rgba(99, 102, 241, 0.1); border: 1px solid var(--border-color); text-align: left;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; font-size: 13px;">Interest Request Status:</span>
                    <span class="badge badge-pending" style="font-size: 10px;">Pending</span>
                  </div>
                  <div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;">
                    Waiting for the seller to accept your request. Contact info will be unlocked once accepted.
                  </div>
                </div>
              `;
            }
          } else {
            interestBtn.textContent = "I'm Interested";
            interestBtn.onclick = () => {
              sendInterestRequest(item);
            };
          }
        }
      }
    }
  }
  
  openModal('detailModal');
}

async function sendInterestRequest(item) {
  if (!currentUser || !users[currentUser]) {
    alert("Please log in first.");
    return;
  }
  
  try {
      const res = await fetch(`${API_URL}/requests`, {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: item.id, itemTitle: item.title })
      });
      if (res.ok) {
          await fetchRequests();
          showToast("Interest Request sent to seller!");
          openDetail(item.id);
      } else {
          alert('Failed to send request');
      }
  } catch (e) {
      alert('Server error');
  }
}

window.acceptRequest = async function(requestId) {
  try {
      const res = await fetch(`${API_URL}/requests/${requestId}/accept`, {
          method: 'PUT',
          headers: getAuthHeaders()
      });
      if (res.ok) {
          await fetchRequests();
          showToast("Request accepted! Contact details shared.");
          openProfile();
      } else {
          const err = await res.json();
          alert(err.error || 'Failed to accept request');
      }
  } catch (e) {
      alert('Server error');
  }
};

window.switchAccount = function(email) {
  const session = sessions.find(s => s.email === email);
  if (session) {
    currentUser = email;
    localStorage.setItem('sem_bazaar_token', session.token);
    updateAuthUI();
    renderListings();
    showToast(`Switched to account: ${email}`);
    closeModal('profileModal');
    // Re-open profile to refresh immediate view
    openProfile();
  }
};

window.removeSession = function(email) {
  sessions = sessions.filter(s => s.email !== email);
  localStorage.setItem('sem_bazaar_sessions_v3', JSON.stringify(sessions));
  showToast(`Removed account session: ${email}`);
  openProfile();
};

function showToast(message) {
  const toast = document.getElementById('toastNotification');
  if (toast) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    // Force reflow to restart transition
    toast.offsetHeight;
    toast.classList.add('show');
    
    if (window.toastTimeout) {
      clearTimeout(window.toastTimeout);
    }
    window.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
      if (window.toastHideTimeout) {
        clearTimeout(window.toastHideTimeout);
      }
      window.toastHideTimeout = setTimeout(() => {
        toast.classList.add('hidden');
      }, 300);
    }, 3000);
  }
}

// Start app
init();
