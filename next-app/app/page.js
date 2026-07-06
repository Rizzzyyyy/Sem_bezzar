"use client";
import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  
  const [showLogin, setShowLogin] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [showSell, setShowSell] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);

  // Forms State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [usn, setUsn] = useState('');
  const [branch, setBranch] = useState('CSE');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoBase64, setLogoBase64] = useState('');
  const [currentUserData, setCurrentUserData] = useState(null);
  
  const [sellTitle, setSellTitle] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellDesc, setSellDesc] = useState('');
  const [sellCategory, setSellCategory] = useState('Textbooks');
  const [sellCondition, setSellCondition] = useState('Like New');
  const [sellImage, setSellImage] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('sem_bazaar_token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setCurrentUser(payload.email);
            fetchUserData(payload.email, token);
            fetchRequests(token);
        } catch(e) {}
    }
    fetchItems();
  }, []);

  const fetchRequests = async (token) => {
    try {
      const res = await fetch('/api/requests', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch(e) {}
  };

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('sem_bazaar_token', data.token);
        setCurrentUser(data.user.email);
        fetchUserData(data.user.email, data.token);
        fetchRequests(data.token);
        setShowLogin(false);
      } else {
        alert(data.error);
      }
    } catch(e) {
      alert("Error logging in");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, usn, branch, phone, address, logo: logoBase64 })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('sem_bazaar_token', data.token);
        setCurrentUser(data.email);
        fetchUserData(data.email, data.token);
        fetchRequests(data.token);
        setShowLogin(false);
      } else {
        alert(data.error);
      }
    } catch(e) {
      alert("Error signing up");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sem_bazaar_token');
    setCurrentUser(null);
    setCurrentUserData(null);
    setShowProfile(false);
  };

  const fetchUserData = async (email, token) => {
    try {
      const res = await fetch(`/api/users/${email}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUserData(data);
      }
    } catch(e) { console.error(e); }
  };

  const handleInterest = async () => {
    if (!currentUser) return alert("Please log in first.");
    const token = localStorage.getItem('sem_bazaar_token');
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ itemId: selectedItem.id, itemTitle: selectedItem.title })
      });
      if (res.ok) {
        alert("Interest request sent!");
        fetchRequests(token);
      }
    } catch (e) { alert("Error sending request"); }
  };

  const handleAccept = async (reqId) => {
    const token = localStorage.getItem('sem_bazaar_token');
    try {
      const res = await fetch(`/api/requests/${reqId}/accept`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Request accepted!");
        fetchRequests(token);
      }
    } catch(e) {}
  };

  const openEditModal = (item) => {
    setEditingItemId(item.id);
    setSellTitle(item.title);
    setSellPrice(item.price);
    setSellDesc(item.description);
    setSellCategory(item.category);
    setSellCondition(item.condition);
    setSellImage(null); // Optional when editing
    setShowSell(true);
  };

  const handleSell = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('sem_bazaar_token');
    if (!token) return alert('Not authenticated');

    const submitData = async (base64Image) => {
      try {
        const url = editingItemId ? `/api/items/${editingItemId}` : '/api/items';
        const method = editingItemId ? 'PUT' : 'POST';
        const bodyData = {
          title: sellTitle, price: sellPrice, category: sellCategory, condition: sellCondition, description: sellDesc
        };
        if (base64Image) bodyData.image = base64Image;

        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(bodyData)
        });
        if (res.ok) {
          setShowSell(false);
          setEditingItemId(null);
          // reset form
          setSellTitle(''); setSellPrice(''); setSellDesc(''); setSellImage(null);
          fetchItems();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to save item');
        }
      } catch(e) { alert('Error saving item'); }
    };

    if (sellImage) {
      const reader = new FileReader();
      reader.onload = (ev) => submitData(ev.target.result);
      reader.readAsDataURL(sellImage);
    } else {
      if (!editingItemId) {
        return alert("Please upload a photo of the object.");
      }
      submitData(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove this listing?")) return;
    const token = localStorage.getItem('sem_bazaar_token');
    try {
      const res = await fetch(`/api/items/${editingItemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setShowSell(false);
        setEditingItemId(null);
        fetchItems();
      }
    } catch(e) {}
  };

  const filteredItems = items.filter(i => {
    if (activeCategory !== 'All' && i.category !== activeCategory) return false;
    if (searchQuery && !i.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <header>
        <div className="logo">Sem Bazaar</div>
        <div className="search-bar">
          <input type="text" placeholder="Search textbooks, notes, arduino..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="nav-actions">
          {currentUser ? (
            <>
              <button className="btn btn-outline" onClick={() => setShowSell(true)}>Sell Item</button>
              <div style={{cursor:'pointer', fontWeight: 600, color: 'var(--accent-color)'}} onClick={() => setShowProfile(true)}>Hi, {currentUserData ? currentUserData.name : 'User'}</div>
            </>
          ) : (
            <button className="btn btn-outline" onClick={() => setShowLogin(true)}>Login / Sign Up</button>
          )}
        </div>
      </header>

      <main className="main-container">
        <aside className="sidebar glass-panel">
          <h3>Categories</h3>
          <ul className="category-list">
            {['All', 'Textbooks', 'Notes', 'Project Components', 'Calculators', 'Miscellaneous'].map(cat => (
              <li key={cat} className={activeCategory === cat ? 'active' : ''} onClick={() => setActiveCategory(cat)}>
                {cat === 'All' ? 'All Items' : cat}
              </li>
            ))}
          </ul>
        </aside>

        <section className="listings-area">
          <div className="listings-header">
            <h2>{activeCategory === 'All' ? 'All Items' : activeCategory}</h2>
            <select className="btn btn-outline" style={{padding: '5px 10px'}} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
          <div className="listings-grid">
            {filteredItems.map(item => (
              <div key={item.id} className="product-card glass-panel">
                <div className="category-badge">{item.category}</div>
                <img src={item.image} alt={item.title} className="product-image" />
                <div className="product-details">
                  <div className="product-title">{item.title}</div>
                  <div className="product-price">₹{item.price}</div>
                  <div className="product-meta">
                    <span>{item.condition}</span>
                    <span>{item.sellerName || item.sellerEmail}</span>
                  </div>
                  <div style={{display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px', width: '100%'}}>
                    <button className="btn btn-primary view-btn" style={{flex: 1}} onClick={() => setSelectedItem(item)}>View Details</button>
                    {currentUser && item.sellerEmail === currentUser ? (
                      <button className="btn btn-outline" onClick={() => openEditModal(item)} style={{padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '38px', borderRadius: '8px'}} title="Edit Item">✏️</button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {showLogin && (
        <div className="modal-overlay active">
          <div className="modal-content glass-panel" style={{maxHeight: '85vh', overflowY: 'auto'}}>
            <button className="modal-close" onClick={() => setShowLogin(false)}>&times;</button>
            {authMode === 'login' ? (
              <div id="loginSection">
                <h2 style={{marginBottom: '20px'}}>Sign In</h2>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" placeholder="e.g. student@rvce.edu.in" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <button className="btn btn-primary full-width-btn" onClick={handleLogin}>Sign In</button>
                <div style={{textAlign: 'center', marginTop: '20px'}}>
                  <p style={{fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px'}}>New to Sem Bazaar?</p>
                  <button className="btn btn-outline full-width-btn" onClick={() => setAuthMode('signup')}>Create your Sem Bazaar account</button>
                </div>
              </div>
            ) : (
              <div id="signupSection">
                <h2 style={{marginBottom: '20px'}}>Create Account</h2>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" placeholder="e.g. student@rvce.edu.in" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" placeholder="Create a password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Profile Logo</label>
                  <input type="file" accept="image/*" onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = ev => setLogoBase64(ev.target.result);
                      reader.readAsDataURL(file);
                    }
                  }} />
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>USN</label>
                  <input type="text" placeholder="e.g. 1RV21CS001" value={usn} onChange={e => setUsn(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Branch</label>
                  <select value={branch} onChange={e => setBranch(e.target.value)}>
                    <option value="CSE">CSE</option>
                    <option value="ISE">ISE</option>
                    <option value="AIML">AIML</option>
                    <option value="CS-DS">CS-DS</option>
                    <option value="CS-CY">CS-CY</option>
                    <option value="ECE">ECE</option>
                    <option value="ETE">ETE</option>
                    <option value="EIE">EIE</option>
                    <option value="EEE">EEE</option>
                    <option value="IEM">IEM</option>
                    <option value="ME">ME</option>
                    <option value="CV">CV</option>
                    <option value="CH">CH</option>
                    <option value="AS">AS</option>
                    <option value="MCA">MCA</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" placeholder="e.g. 9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Hostel Block / Address</label>
                  <input type="text" placeholder="e.g. Cauvery Block, Room 102" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <button className="btn btn-primary full-width-btn" onClick={handleSignup}>Create Account</button>
                <div style={{textAlign: 'center', marginTop: '20px'}}>
                  <p style={{fontSize: '14px', color: 'var(--text-secondary)'}}>Already have an account? <a href="#" style={{color: 'var(--accent-color)', textDecoration: 'none'}} onClick={(e) => { e.preventDefault(); setAuthMode('login'); }}>Sign in</a></p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showProfile && (
        <div className="modal-overlay active">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={() => setShowProfile(false)}>&times;</button>
            <h2 style={{marginBottom: '20px'}}>My Profile</h2>
            {currentUserData ? (
              <div style={{display:'flex', gap:'20px', alignItems:'center', marginBottom: '20px'}}>
                {currentUserData.logo && <img src={currentUserData.logo} alt="Profile" style={{width:'80px', height:'80px', borderRadius:'50%', objectFit:'cover'}} />}
                <div>
                  <h3 style={{margin:0}}>{currentUserData.name}</h3>
                  <p style={{margin:'5px 0', color:'var(--text-secondary)'}}>{currentUserData.email}</p>
                  <p style={{margin:'5px 0', fontSize:'14px'}}><strong>USN:</strong> {currentUserData.usn} | <strong>Branch:</strong> {currentUserData.branch}</p>
                  {(currentUserData.phone || currentUserData.address) && (
                    <p style={{margin:'5px 0', fontSize:'14px'}}>
                      {currentUserData.phone && <span><strong>Phone:</strong> {currentUserData.phone} <br/></span>}
                      {currentUserData.address && <span><strong>Address:</strong> {currentUserData.address}</span>}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p>Logged in as: {currentUser}</p>
            )}
            <button className="btn btn-primary full-width-btn" onClick={handleLogout} style={{background: 'var(--danger)', borderColor: 'var(--danger)', marginTop: '20px'}}>Logout</button>
            
            {requests.length > 0 && (
              <div style={{marginTop: '20px'}}>
                <h3>Interest Requests</h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px'}}>
                  {requests.map(req => {
                    const isMyItem = currentUserData && req.sellerEmail === currentUserData.email;
                    const isAccepted = req.status === 'accepted';
                    return (
                      <div key={req.requestId} style={{padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '14px'}}>
                        <div style={{fontWeight: 'bold'}}>{req.itemTitle}</div>
                        {isMyItem ? (
                          <>
                            <div>Buyer: {req.buyerName} ({req.buyerUsn})</div>
                            {!isAccepted && <button onClick={() => handleAccept(req.requestId)} className="btn btn-primary" style={{padding: '5px 10px', marginTop: '5px'}}>Accept Request</button>}
                            {isAccepted && <div style={{color: 'var(--success)', marginTop: '5px'}}>Accepted! Email: {req.buyerEmail}</div>}
                          </>
                        ) : (
                          <>
                            <div>Status: <span style={{color: isAccepted ? 'var(--success)' : 'var(--accent-color)'}}>{req.status}</span></div>
                            {isAccepted && <div style={{marginTop: '5px'}}>Seller Email: {req.sellerEmail}</div>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showSell && (
        <div className="modal-overlay active">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={() => { setShowSell(false); setEditingItemId(null); }}>&times;</button>
            <h2 style={{marginBottom: '20px'}}>{editingItemId ? "Edit Listing" : "List an Item"}</h2>
            <form onSubmit={handleSell}>
              <div className="form-group">
                <label>Item Title</label>
                <input type="text" value={sellTitle} onChange={e => setSellTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={sellCategory} onChange={e => setSellCategory(e.target.value)}>
                  <option value="Textbooks">Textbooks</option>
                  <option value="Notes">Study Notes</option>
                  <option value="Project Components">Project Components</option>
                  <option value="Calculators">Calculators</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>
              <div className="form-group">
                <label>Price (₹)</label>
                <input type="number" value={sellPrice} onChange={e => setSellPrice(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Condition</label>
                <select value={sellCondition} onChange={e => setSellCondition(e.target.value)}>
                  <option value="Like New">Like New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows="3" value={sellDesc} onChange={e => setSellDesc(e.target.value)} required></textarea>
              </div>
              <div className="form-group">
                <label>Image {editingItemId ? '(Optional, leave blank to keep current)' : ''}</label>
                <input type="file" accept="image/*" onChange={e => setSellImage(e.target.files[0])} required={!editingItemId} />
              </div>
              <button type="submit" className="btn btn-primary full-width-btn" style={{marginBottom: '10px'}}>{editingItemId ? "Save Changes" : "Publish Listing"}</button>
              {editingItemId && (
                <button type="button" className="btn btn-outline full-width-btn" onClick={handleDelete} style={{borderColor: 'var(--danger)', color: 'var(--danger)'}}>Delete Item</button>
              )}
            </form>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="modal-overlay active">
          <div className="modal-content glass-panel" style={{display: 'flex', flexDirection: 'column'}}>
            <button className="modal-close" onClick={() => setSelectedItem(null)}>&times;</button>
            <h2 style={{marginBottom: '10px'}}>{selectedItem.title}</h2>
            <div className="category-badge" style={{position: 'relative', top: '0', right: '0', display: 'inline-block', marginBottom: '15px'}}>{selectedItem.category}</div>
            
            <img src={selectedItem.image} alt={selectedItem.title} style={{width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '12px', marginBottom: '20px'}} />
            
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <div style={{fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-color)'}}>₹{selectedItem.price}</div>
              <div style={{fontSize: '14px', color: 'var(--text-secondary)'}}>Condition: {selectedItem.condition}</div>
            </div>
            
            <div style={{background: 'var(--input-bg)', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
              <h4 style={{marginBottom: '10px', fontSize: '14px'}}>Description</h4>
              <p style={{fontSize: '14px', lineHeight: '1.5', color: 'var(--text-secondary)'}}>{selectedItem.description}</p>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', padding: '15px', background: 'var(--bg-secondary)', borderRadius: '12px'}}>
              <div>
                <div style={{fontSize: '12px', color: 'var(--text-secondary)'}}>Seller</div>
                <div style={{fontWeight: '600'}}>{selectedItem.sellerName || selectedItem.sellerEmail}</div>
              </div>
            </div>
            
            {(() => {
              const req = requests.find(r => r.itemId === selectedItem.id && r.buyerEmail === currentUser);
              if (req) {
                 return <button className="btn btn-primary full-width-btn" disabled style={{opacity: 0.7}}>Request {req.status}</button>;
              } else if (currentUser === selectedItem.sellerEmail) {
                 return null;
              } else {
                 return <button className="btn btn-primary full-width-btn" onClick={handleInterest}>I'm Interested</button>;
              }
            })()}
          </div>
        </div>
      )}
    </>
  );
}
