import { getDatabase, ref, push, update, query, orderByChild, equalTo, get } from "firebase/database";

const db = getDatabase();

// Search clients by name or company
export async function searchClients(searchTerm) {
  const clientsSnapshot = await get(ref(db, 'clients'));
  const contactsSnapshot = await get(ref(db, 'contacts'));
  
  const results = [];
  
  // Search companies
  clientsSnapshot.forEach((client) => {
    if (client.val().name.toLowerCase().includes(searchTerm.toLowerCase())) {
      results.push({
        id: client.key,
        name: client.val().name,
        type: 'Company'
      });
    }
  });
  
  // Search individual contacts
  contactsSnapshot.forEach((contact) => {
    if (contact.val().companyId === null && 
        `${contact.val().firstName} ${contact.val().lastName}`.toLowerCase().includes(searchTerm.toLowerCase())) {
      results.push({
        id: contact.key,
        name: `${contact.val().firstName} ${contact.val().lastName}`,
        type: 'Individual'
      });
    }
  });
  
  return results;
}

// Get diary entries with search
export async function searchDiaryEntries(diaryType, searchTerm) {
  const diaryRef = ref(db, `diaries/${diaryType}`);
  const snapshot = await get(diaryRef);
  
  const results = [];
  snapshot.forEach((entry) => {
    const entryData = entry.val();
    if (entryData.notes.toLowerCase().includes(searchTerm.toLowerCase()) || 
        entryData.clientId.toLowerCase().includes(searchTerm.toLowerCase())) {
      results.push({
        ...entryData,
        id: entry.key
      });
    }
  });
  
  return results;
}

// Add to db-operations.js
export function formatCaribbeanPhone(phone) {
    if (!phone) return null;
    
    // Handle formats like: +1(868)123-4567 or 18681234567
    const cleaned = phone.replace(/\D/g, '');
    
    // If starts with country code
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      return `+${cleaned}`;
    }
    
    // If local number (assume Trinidad for example)
    if (cleaned.length === 7) {
      return `+1868${cleaned}`;
    }
    
    return null; // Invalid format
  }