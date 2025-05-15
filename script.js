//wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Only run auth code on login page
    if (document.getElementById('loginForm')) {
        initAuth();
    }
});

// Main authentication function
function initAuth() {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        loginError.textContent = '';

        try {
            // 1. Sign in with Firebase Auth
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            
            // 2. Manual "pre-registered users" check (no Firestore needed)
            const allowedDomains = ['@procom.com', '@professionalcomputing.co.uk'];
            const isAllowed = allowedDomains.some(domain => email.endsWith(domain));
            
            if (!isAllowed) {
                await firebase.auth().signOut();
                throw new Error('Unauthorized domain');
            }

            // 3. Redirect on success
            window.location.href = 'home.html';
            
        } catch (error) {
            handleAuthError(error, loginError);
        }
    });
}

// Error handling
function handleAuthError(error, loginError) {
    console.error('Auth error:', error);
    
    const messages = {
        'auth/wrong-password': 'Wrong password',
        'auth/user-not-found': 'User not found',
        'Unauthorized domain': 'Only company emails allowed',
        default: 'Login failed. Try again later.'
    };

    loginError.textContent = messages[error.code] || messages[error.message] || messages.default;
}

// Protect all other pages
firebase.auth().onAuthStateChanged(user => {
    if (!user && !location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
    }
});





function setupLogin() {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        auth.signInWithEmailAndPassword(email, password)
            .then(function(userCredential) {
                //worked so redirect to home page
                window.location.href = 'home.html';
            })
            .catch(function(error) {
                //errors
                if (error.code === 'auth/wrong-password') {
                    loginError.textContent = 'Wrong password. Please try again.';
                } else if (error.code === 'auth/user-not-found') {
                    loginError.textContent = 'User not found. Please check your email.';
                } else {
                    loginError.textContent = 'Login error: ' + error.message;
                }
            });
    });
}

function setupHomePage() {
    const logoutBtn = document.getElementById('logoutBtn');
    const diaryLinks = document.querySelectorAll('.diary-link');
    
    auth.onAuthStateChanged(function(user) {
        if (!user) {
            //not logged in, redirect to login
            window.location.href = 'index.html';
        } else {
            //user is logged in, load their data
            loadUserData(user.uid);
        }
    });
    
    logoutBtn.addEventListener('click', function() {
        auth.signOut().then(function() {
            window.location.href = 'index.html';
        });
    });

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterDiaryEntries(searchTerm);
    });

    //diary navigation
    diaryLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const diaryType = this.getAttribute('data-diary');
            loadDiary(diaryType);
        });
    });
    
    //load default diary
    loadDiary('daily');
}

function filterDiaryEntries(searchTerm) {
    //get all visible diary entries
    const visibleDiary = document.querySelector('.diary-section:not(.hidden)');
    if (!visibleDiary) return;
    
    const entriesContainer = document.getElementById(visibleDiary.id + '-entries');
    const originalEntries = JSON.parse(entriesContainer.dataset.originalEntries || '[]');
    
    //clear current entries
    entriesContainer.innerHTML = '';
    
    if (searchTerm.trim() === '') {
        //if search is empty, show all original entries
        originalEntries.forEach(entry => {
            const entryElement = createDiaryEntryElement(entry, visibleDiary.id.replace('-diary', ''));
            entriesContainer.appendChild(entryElement);
        });
        return;
    }
    
    //filter entries
    const filteredEntries = originalEntries.filter(entry => {
        const fieldsToSearch = [
            entry.clientName?.toLowerCase() || '',
            entry.companyName?.toLowerCase() || '',
            entry.callNotes?.toLowerCase() || '',
            entry.product?.toLowerCase() || '',
            entry.clientContact?.toLowerCase() || '',
            entry.invoiceNumber?.toLowerCase() || ''
        ];
        
        return fieldsToSearch.some(field => field.includes(searchTerm));
    });
    
    //display filtered entries
    if (filteredEntries.length === 0) {
        entriesContainer.innerHTML = '<p>No matching entries found</p>';
    } else {
        filteredEntries.forEach(entry => {
            const entryElement = createDiaryEntryElement(entry, visibleDiary.id.replace('-diary', ''));
            entriesContainer.appendChild(entryElement);
        });
    }
}

function loadUserData(userId) {
    //get user role from Firestore
    db.collection('users').doc(userId).get()
        .then(function(doc) {
            if (doc.exists) {
                const userData = doc.data();
                updateUIForRole(userData.role);
            } else {
                console.log('No user data found');
            }
        })
        .catch(function(error) {
            console.log('Error getting user data:', error);
        });
}

function updateUIForRole(role) {
    //hide/show elements based on role
    const adminElements = document.querySelectorAll('.admin-only');
    const supervisorElements = document.querySelectorAll('.supervisor-only');
    const devElements = document.querySelectorAll('.dev-only');
    
    //reset all
    adminElements.forEach(function(el) {
        el.classList.add('hidden');
    });
    supervisorElements.forEach(function(el) {
        el.classList.add('hidden');
    });
    devElements.forEach(function(el) {
        el.classList.add('hidden');
    });
    
    //show based on role
    if (role === 'admin') {
        adminElements.forEach(function(el) {
            el.classList.remove('hidden');
        });
    } else if (role === 'supervisor') {
        supervisorElements.forEach(function(el) {
            el.classList.remove('hidden');
        });
    } else if (role === 'developer') {
        devElements.forEach(function(el) {
            el.classList.remove('hidden');
        });
    }
}

function loadDiary(diaryType) {
    //hide all diary sections first
    document.querySelectorAll('.diary-section').forEach(function(section) {
        section.classList.add('hidden');
    });
    
    //show selected diary
    document.getElementById(diaryType + '-diary').classList.remove('hidden');
    
    //load data for this diary
    loadDiaryData(diaryType);
}

function loadDiaryData(diaryType) {
    const entriesContainer = document.getElementById(diaryType + '-entries');
    entriesContainer.innerHTML = '<p>Loading...</p>';
    entriesContainer.dataset.originalEntries = '';

    db.collection(diaryType).orderBy('date', 'desc').get()
        .then(function(querySnapshot) {
            entriesContainer.innerHTML = '';

            if (querySnapshot.empty) {
                entriesContainer.innerHTML = '<p>No entries found</p>';
                return;
            }

            const entriesData = [];
            
            querySnapshot.forEach(function(doc) {
                const entry = doc.data();
                entry.id = doc.id; //add the document ID to the entry object
                entriesData.push(entry);
                const entryElement = createDiaryEntryElement(entry, diaryType);
                entriesContainer.appendChild(entryElement);
            });
            
            entriesContainer.dataset.originalEntries = JSON.stringify(entriesData);
        })
        .catch(function(error) {
            entriesContainer.innerHTML = '<p>Error loading entries: ' + error.message + '</p>';
        });
}

function createDiaryEntryElement(entry, diaryType) {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'entry';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'entry-header';
    
    const dateSpan = document.createElement('span');
    dateSpan.textContent = new Date(entry.date).toLocaleDateString();
    
    const clientSpan = document.createElement('span');
    clientSpan.textContent = entry.clientName || entry.companyName;
    
    headerDiv.appendChild(dateSpan);
    headerDiv.appendChild(clientSpan);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'entry-content';
    
    //common fields
    if (entry.callNotes) {
        const notesP = document.createElement('p');
        notesP.innerHTML = '<strong>Call Notes:</strong> ' + entry.callNotes;
        contentDiv.appendChild(notesP);
    }
    
    if (entry.bfDate) {
        const bfDateP = document.createElement('p');
        bfDateP.innerHTML = '<strong>BF Date:</strong> ' + entry.bfDate;
        contentDiv.appendChild(bfDateP);
    }
    
    //diary-specific fields
    if (diaryType === 'payment' && entry.invoiceNumber) {
        const invoiceP = document.createElement('p');
        invoiceP.innerHTML = '<strong>Invoice #:</strong> ' + entry.invoiceNumber;
        contentDiv.appendChild(invoiceP);
    }
    
    if (diaryType === 'payment' && entry.amount) {
        const amountP = document.createElement('p');
        amountP.innerHTML = '<strong>Amount:</strong> £' + entry.amount;
        contentDiv.appendChild(amountP);
    }
    
    if (entry.product) {
        const productP = document.createElement('p');
        productP.innerHTML = '<strong>Product/Software:</strong> ' + entry.product;
        contentDiv.appendChild(productP);
    }
    
    if (entry.clientContact) {
        const contactP = document.createElement('p');
        contactP.innerHTML = '<strong>Client Contact:</strong> ' + entry.clientContact;
        contentDiv.appendChild(contactP);
    }
    
    //add edit button for BF date
    if (entry.bfDate) {
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Update BF Date';
        editBtn.className = 'edit-btn';
        editBtn.addEventListener('click', function() {
            updateBFDate(entry.id, diaryType);
        });
        contentDiv.appendChild(editBtn);
    }
    
    entryDiv.appendChild(headerDiv);
    entryDiv.appendChild(contentDiv);
    
    return entryDiv;
}

function updateBFDate(entryId, diaryType) {
    const newDate = prompt('Enter new BF Date (YYYY-MM-DD):');
    if (!newDate) return;
    
    const notes = prompt('Add call notes for this update:');
    if (notes === null) return;
    
    //get current entry first to preserve existing notes
    db.collection(diaryType).doc(entryId).get()
        .then(function(doc) {
            if (doc.exists) {
                const currentData = doc.data();
                const updatedNotes = currentData.callNotes + '\n\n' + new Date().toLocaleString() + ': ' + notes;
                
                //update the entry
                return db.collection(diaryType).doc(entryId).update({
                    bfDate: newDate,
                    callNotes: updatedNotes
                });
            }
        })
        .then(function() {
            alert('BF Date updated successfully');
            loadDiaryData(diaryType); //refresh the view
        })
        .catch(function(error) {
            alert('Error updating BF Date: ' + error.message);
        });
}

function setupDiaryTabs() {
    const tabs = document.querySelectorAll('.diary-tabs .tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const diaryType = this.getAttribute('data-diary');
            
            //remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            //add active class to clicked tab
            this.classList.add('active');
            
            //navigate to the corresponding page
            switch(diaryType) {
                case 'daily':
                    window.location.href = 'daily_diary.html';
                    break;
                case 'payment':
                    window.location.href = 'payment_diary.html';
                    break;
                case 'worksheets':
                    window.location.href = 'worksheets.html';
                    break;
            }
        });
    });
}

function highlightCurrentTab() {
    const path = window.location.pathname;
    let currentDiary = '';
    
    if (path.includes('daily_diary.html')) {
        currentDiary = 'daily';
    } else if (path.includes('payment_diary.html')) {
        currentDiary = 'payment';
    } else if (path.includes('worksheets.html')) {
        currentDiary = 'worksheets';
    }
    
    if (currentDiary) {
        const tabs = document.querySelectorAll('.diary-tabs .tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-diary') === currentDiary) {
                tab.classList.add('active');
            }
        });
    }
}//wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    //check if we're on the login page
    if (document.getElementById('loginForm')) {
        setupLogin();
    }
    
    //check if we're on any diary page (including home)
    if (document.getElementById('logoutBtn') || document.querySelector('.diary-tabs')) {
        setupDiaryPage();
    }
});

function setupLogin() {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        auth.signInWithEmailAndPassword(email, password)
            .then(function(userCredential) {
                //worked so redirect to home page
                window.location.href = 'home.html';
            })
            .catch(function(error) {
                //errors
                if (error.code === 'auth/wrong-password') {
                    loginError.textContent = 'Wrong password. Please try again.';
                } else if (error.code === 'auth/user-not-found') {
                    loginError.textContent = 'User not found. Please check your email.';
                } else {
                    loginError.textContent = 'Login error: ' + error.message;
                }
            });
    });
}

function setupDiaryPage() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    auth.onAuthStateChanged(function(user) {
        if (!user) {
            //not logged in, redirect to login
            window.location.href = 'index.html';
        } else {
            //user is logged in, load their data
            loadUserData(user.uid);
            
            //setup diary tabs if they exist
            if (document.querySelector('.diary-tabs')) {
                setupDiaryTabs();
                highlightCurrentTab();
            }
            
            //setup search if it exists
            if (document.getElementById('searchInput')) {
                setupSearch();
            }
            
            //load diary data if we're on a diary page
            if (document.querySelector('.diary-section')) {
                const defaultDiary = window.location.pathname.includes('payment_diary.html') ? 'payment' : 
                                   window.location.pathname.includes('worksheets.html') ? 'worksheets' : 'daily';
                loadDiary(defaultDiary);
            }
        }
    });
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            auth.signOut().then(function() {
                window.location.href = 'index.html';
            });
        });
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterDiaryEntries(searchTerm);
    });
}

function filterDiaryEntries(searchTerm) {
    //get all visible diary entries
    const visibleDiary = document.querySelector('.diary-section:not(.hidden)');
    if (!visibleDiary) return;
    
    const entriesContainer = document.getElementById(visibleDiary.id + '-entries');
    const originalEntries = JSON.parse(entriesContainer.dataset.originalEntries || '[]');
    
    //clear current entries
    entriesContainer.innerHTML = '';
    
    if (searchTerm.trim() === '') {
        //if search is empty, show all original entries
        originalEntries.forEach(entry => {
            const entryElement = createDiaryEntryElement(entry, visibleDiary.id.replace('-diary', ''));
            entriesContainer.appendChild(entryElement);
        });
        return;
    }
    
    //filter entries
    const filteredEntries = originalEntries.filter(entry => {
        const fieldsToSearch = [
            entry.clientName?.toLowerCase() || '',
            entry.companyName?.toLowerCase() || '',
            entry.callNotes?.toLowerCase() || '',
            entry.product?.toLowerCase() || '',
            entry.clientContact?.toLowerCase() || '',
            entry.invoiceNumber?.toLowerCase() || ''
        ];
        
        return fieldsToSearch.some(field => field.includes(searchTerm));
    });
    
    //display filtered entries
    if (filteredEntries.length === 0) {
        entriesContainer.innerHTML = '<p>No matching entries found</p>';
    } else {
        filteredEntries.forEach(entry => {
            const entryElement = createDiaryEntryElement(entry, visibleDiary.id.replace('-diary', ''));
            entriesContainer.appendChild(entryElement);
        });
    }
}

function loadUserData(userId) {
    //get user role from Firestore
    db.collection('users').doc(userId).get()
        .then(function(doc) {
            if (doc.exists) {
                const userData = doc.data();
                updateUIForRole(userData.role);
            } else {
                console.log('No user data found');
            }
        })
        .catch(function(error) {
            console.log('Error getting user data:', error);
        });
}

function updateUIForRole(role) {
    //hide/show elements based on role
    const adminElements = document.querySelectorAll('.admin-only');
    const supervisorElements = document.querySelectorAll('.supervisor-only');
    const devElements = document.querySelectorAll('.dev-only');
    
    //reset all
    adminElements.forEach(function(el) {
        el.classList.add('hidden');
    });
    supervisorElements.forEach(function(el) {
        el.classList.add('hidden');
    });
    devElements.forEach(function(el) {
        el.classList.add('hidden');
    });
    
    //show based on role
    if (role === 'admin') {
        adminElements.forEach(function(el) {
            el.classList.remove('hidden');
        });
    } else if (role === 'supervisor') {
        supervisorElements.forEach(function(el) {
            el.classList.remove('hidden');
        });
    } else if (role === 'developer') {
        devElements.forEach(function(el) {
            el.classList.remove('hidden');
        });
    }
}

function setupDiaryTabs() {
    const tabs = document.querySelectorAll('.diary-tabs .tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const diaryType = this.getAttribute('data-diary');
            
            //remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            //add active class to clicked tab
            this.classList.add('active');
            
            //navigate to the corresponding page
            switch(diaryType) {
                case 'daily':
                    window.location.href = 'daily_diary.html';
                    break;
                case 'payment':
                    window.location.href = 'payment_diary.html';
                    break;
                case 'worksheets':
                    window.location.href = 'worksheets.html';
                    break;
            }
        });
    });
}

function highlightCurrentTab() {
    const path = window.location.pathname;
    let currentDiary = '';
    
    if (path.includes('daily_diary.html')) {
        currentDiary = 'daily';
    } else if (path.includes('payment_diary.html')) {
        currentDiary = 'payment';
    } else if (path.includes('worksheets.html')) {
        currentDiary = 'worksheets';
    }
    
    if (currentDiary) {
        const tabs = document.querySelectorAll('.diary-tabs .tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-diary') === currentDiary) {
                tab.classList.add('active');
            }
        });
    }
}

function loadDiary(diaryType) {
    //hide all diary sections first (if they exist)
    document.querySelectorAll('.diary-section').forEach(function(section) {
        section.classList.add('hidden');
    });
    
    //show selected diary (if it exists)
    const diarySection = document.getElementById(diaryType + '-diary');
    if (diarySection) {
        diarySection.classList.remove('hidden');
    }
    
    //load data for this diary
    loadDiaryData(diaryType);
}

function loadDiaryData(diaryType) {
    const entriesContainer = document.getElementById(diaryType + '-entries');
    if (!entriesContainer) return;
    
    entriesContainer.innerHTML = '<p>Loading...</p>';
    entriesContainer.dataset.originalEntries = '';

    db.collection(diaryType).orderBy('date', 'desc').get()
        .then(function(querySnapshot) {
            entriesContainer.innerHTML = '';

            if (querySnapshot.empty) {
                entriesContainer.innerHTML = '<p>No entries found</p>';
                return;
            }

            const entriesData = [];
            
            querySnapshot.forEach(function(doc) {
                const entry = doc.data();
                entry.id = doc.id; //add the document ID to the entry object
                entriesData.push(entry);
                const entryElement = createDiaryEntryElement(entry, diaryType);
                entriesContainer.appendChild(entryElement);
            });
            
            entriesContainer.dataset.originalEntries = JSON.stringify(entriesData);
        })
        .catch(function(error) {
            entriesContainer.innerHTML = '<p>Error loading entries: ' + error.message + '</p>';
        });
}

function createDiaryEntryElement(entry, diaryType) {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'entry';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'entry-header';
    
    const dateSpan = document.createElement('span');
    dateSpan.textContent = new Date(entry.date).toLocaleDateString();
    
    const clientSpan = document.createElement('span');
    clientSpan.textContent = entry.clientName || entry.companyName;
    
    headerDiv.appendChild(dateSpan);
    headerDiv.appendChild(clientSpan);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'entry-content';
    
    //common fields
    if (entry.callNotes) {
        const notesP = document.createElement('p');
        notesP.innerHTML = '<strong>Call Notes:</strong> ' + entry.callNotes;
        contentDiv.appendChild(notesP);
    }
    
    if (entry.bfDate) {
        const bfDateP = document.createElement('p');
        bfDateP.innerHTML = '<strong>BF Date:</strong> ' + entry.bfDate;
        contentDiv.appendChild(bfDateP);
    }
    
    //diary-specific fields
    if (diaryType === 'payment' && entry.invoiceNumber) {
        const invoiceP = document.createElement('p');
        invoiceP.innerHTML = '<strong>Invoice #:</strong> ' + entry.invoiceNumber;
        contentDiv.appendChild(invoiceP);
    }
    
    if (diaryType === 'payment' && entry.amount) {
        const amountP = document.createElement('p');
        amountP.innerHTML = '<strong>Amount:</strong> £' + entry.amount;
        contentDiv.appendChild(amountP);
    }
    
    if (entry.product) {
        const productP = document.createElement('p');
        productP.innerHTML = '<strong>Product/Software:</strong> ' + entry.product;
        contentDiv.appendChild(productP);
    }
    
    if (entry.clientContact) {
        const contactP = document.createElement('p');
        contactP.innerHTML = '<strong>Client Contact:</strong> ' + entry.clientContact;
        contentDiv.appendChild(contactP);
    }
    
    //add edit button for BF date
    if (entry.bfDate) {
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Update BF Date';
        editBtn.className = 'edit-btn';
        editBtn.addEventListener('click', function() {
            updateBFDate(entry.id, diaryType);
        });
        contentDiv.appendChild(editBtn);
    }
    
    entryDiv.appendChild(headerDiv);
    entryDiv.appendChild(contentDiv);
    
    return entryDiv;
}

function updateBFDate(entryId, diaryType) {
    const newDate = prompt('Enter new BF Date (YYYY-MM-DD):');
    if (!newDate) return;
    
    const notes = prompt('Add call notes for this update:');
    if (notes === null) return;
    
    //get current entry first to preserve existing notes
    db.collection(diaryType).doc(entryId).get()
        .then(function(doc) {
            if (doc.exists) {
                const currentData = doc.data();
                const updatedNotes = currentData.callNotes + '\n\n' + new Date().toLocaleString() + ': ' + notes;
                
                //update the entry
                return db.collection(diaryType).doc(entryId).update({
                    bfDate: newDate,
                    callNotes: updatedNotes
                });
            }
        })
        .then(function() {
            alert('BF Date updated successfully');
            loadDiaryData(diaryType); //refresh the view
        })
        .catch(function(error) {
            alert('Error updating BF Date: ' + error.message);
        });
}


function addCompanyWithContacts(companyData, contacts) {
    const db = firebase.database();
    const companyId = db.ref('companies').push().key;
    
    const updates = {};
    
    // Add company
    updates[`companies/${companyId}`] = {
      ...companyData,
      contacts: {} // Initialize contacts map
    };
    
    // Add contacts
    contacts.forEach(contact => {
      const contactId = db.ref('contacts').push().key;
      updates[`contacts/${contactId}`] = {
        ...contact,
        companyId: companyId
      };
      updates[`companies/${companyId}/contacts/${contactId}`] = true;
    });
    
    return db.ref().update(updates);
  }

  