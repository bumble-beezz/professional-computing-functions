document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const isCompanyCheckbox = document.getElementById('isCompany');
    const companyFields = document.getElementById('companyFields');
    const addContactBtn = document.getElementById('addContactBtn');
    const contactList = document.getElementById('contactList');
    const submitBtn = document.getElementById('submitBtn');
    
    let contacts = []; // Stores all contacts to be saved
    let isCompany = false;

    // Toggle company fields
    isCompanyCheckbox.addEventListener('change', function() {
        isCompany = this.checked;
        companyFields.style.display = isCompany ? 'block' : 'none';
        addContactBtn.style.display = isCompany ? 'inline-block' : 'none';
    });

    // Add contact to list
    addContactBtn.addEventListener('click', function() {
        const contact = getFormData();
        if (!contact) return;
        
        contacts.push(contact);
        renderContactList();
        clearContactForm();
    });

    // Main submit function
    submitBtn.addEventListener('click', async function() {
        const primaryContact = getFormData();
        if (!primaryContact) return;
        
        try {
            if (isCompany) {
                await saveCompanyWithContacts(primaryContact);
            } else {
                await saveIndividualClient(primaryContact);
            }
            alert('Client saved successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error saving client:', error);
            alert('Error saving client: ' + error.message);
        }
    });

    // Helper functions
    function getFormData() {
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        
        if (!firstName || !lastName || !email) {
            alert('Please fill in all required fields');
            return null;
        }

        return {
            firstName,
            lastName,
            email,
            phones: {
                mobile: formatPhone(document.getElementById('mobile').value),
                work: formatPhone(document.getElementById('work').value),
                home: formatPhone(document.getElementById('home').value),
                fax: formatPhone(document.getElementById('fax').value)
            }
        };
    }

    function formatPhone(phone) {
        return phone ? phone.replace(/\D/g, '') : null;
    }

    function renderContactList() {
        contactList.innerHTML = '<h3>Additional Contacts</h3>';
        contacts.forEach((contact, index) => {
            const div = document.createElement('div');
            div.className = 'contact-card';
            div.innerHTML = `
                <p><strong>${contact.firstName} ${contact.lastName}</strong></p>
                <p>Email: ${contact.email}</p>
                <p>Mobile: ${contact.phones.mobile || 'N/A'}</p>
                <button onclick="removeContact(${index})">Remove</button>
            `;
            contactList.appendChild(div);
        });
    }

    function clearContactForm() {
        document.getElementById('firstName').value = '';
        document.getElementById('lastName').value = '';
        document.getElementById('email').value = '';
        document.getElementById('mobile').value = '';
        document.getElementById('work').value = '';
        document.getElementById('home').value = '';
        document.getElementById('fax').value = '';
    }

    // Save to Realtime Database
    async function saveCompanyWithContacts(primaryContact) {
        const companyName = document.getElementById('companyName').value.trim();
        if (!companyName) throw new Error('Company name is required');
        
        const db = firebase.database();
        const companyId = db.ref('companies').push().key;
        
        // Prepare all data updates
        const updates = {};
        
        // 1. Add company
        updates[`companies/${companyId}`] = {
            name: companyName,
            payFrequency: document.getElementById('payFrequency').value,
            phone: formatPhone(document.getElementById('work').value),
            fax: formatPhone(document.getElementById('fax').value),
            contacts: {} // Initialize contacts map
        };
        
        // 2. Add primary contact (mark as primary)
        const primaryContactId = db.ref('contacts').push().key;
        updates[`contacts/${primaryContactId}`] = {
            ...primaryContact,
            companyId: companyId,
            isPrimaryContact: true
        };
        updates[`companies/${companyId}/contacts/${primaryContactId}`] = true;
        
        // 3. Add additional contacts
        contacts.forEach(contact => {
            const contactId = db.ref('contacts').push().key;
            updates[`contacts/${contactId}`] = {
                ...contact,
                companyId: companyId
            };
            updates[`companies/${companyId}/contacts/${contactId}`] = true;
        });
        
        // Save everything at once
        await db.ref().update(updates);
    }

    async function saveIndividualClient(contact) {
        const db = firebase.database();
        const contactId = db.ref('contacts').push().key;
        
        await db.ref(`contacts/${contactId}`).set({
            ...contact,
            companyId: null // Mark as individual
        });
    }

    // Global function for contact removal
    window.removeContact = function(index) {
        contacts.splice(index, 1);
        renderContactList();
    };
});

async function addEmployeeToCompany(companyId, employeeData) {
    const db = firebase.database();
    const updates = {};
    
    // Generate new contact ID
    const contactId = db.ref('contacts').push().key;
    
    // 1. Add to contacts collection
    updates[`contacts/${contactId}`] = {
      ...employeeData,
      companyId: companyId
    };
    
    // 2. Add reference to company's contacts
    updates[`companies/${companyId}/contacts/${contactId}`] = true;
    
    // Execute atomic update
    await db.ref().update(updates);
    return contactId;
  }
  
  // Example Usage:
  const newEmployee = {
    firstName: "Sarah",
    lastName: "Connor",
    email: "sarah@xyzcorp.com",
    phones: { mobile: "+447700999888" }
  };
  
  addEmployeeToCompany("comp_xyz123", newEmployee)
    .then(id => console.log("Added employee with ID:", id));

    function convertClient(oldClient, clientId) {
        const isCompany = oldClient.company_name !== null;
        
        // Base client structure
        const newData = {
          clients: {},
          contacts: {}
        };
        
        if (isCompany) {
          // 1. Create company record
          newData.clients[clientId] = {
            name: oldClient.company_name,
            payFrequency: oldClient.pay_frequency.toLowerCase(),
            diaryRefs: { daily: true, payment: true } // Enable all diaries by default
          };
          
          // 2. Add contact linked to company
          const [firstName, lastName] = oldClient.contact_name.split(' ');
          const contactId = `cont_${firstName.toLowerCase()}${Math.floor(Math.random()*1000)}`;
          
          newData.contacts[contactId] = {
            firstName,
            lastName,
            email: oldClient.email_add || null,
            companyId: clientId,
            phones: {
              work: oldClient["tel_no#"] ? `+44${oldClient["tel_no#"].substring(1)}` : null,
              mobile: oldClient["cell_no#"] ? `+44${oldClient["cell_no#"].substring(1)}` : null
            }
          };
        } else {
          // 3. Individual contact
          const [firstName, lastName] = oldClient.contact_name.split(' ');
          const contactId = `cont_${firstName.toLowerCase()}${Math.floor(Math.random()*1000)}`;
          
          newData.contacts[contactId] = {
            firstName,
            lastName,
            companyId: null,
            phones: {
              mobile: oldClient["cell_no#"] ? `+44${oldClient["cell_no#"].substring(1)}` : null
            }
          };
        }
        
        return newData;
      }
      
      // Usage example:
      const oldClientData = {
        "company_name": "Tech Solutions Ltd",
        "contact_name": "John Smith",
        "tel_no#": "02081234567",
        "pay_frequency": "Monthly"
      };
      
      const converted = convertClient(oldClientData, "comp_tech123");
      console.log(converted); 