//firebase config thingy goes here
const firebaseConfig = {
    
  };
  
  //initialize firebase
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  /*notes:

Replace the placeholder values in firebase-config.js with your actual Firebase project credentials.

Make sure to enable Email/Password authentication in Firebase Console.

User Roles:

need to create a 'users' collection in Firestore where each document ID is the user's UID.

Each user document should have a role field (admin, supervisor, developer1, developer2).

Diary Data Structure:

Create collections in Firestore named 'daily', 'payment', and 'worksheets'.

Each document in these collections should have fields like:

clientName/companyName

date (timestamp)

callNotes

bfDate

invoiceNumber (for payment diary)

amount (for payment diary)

product/software

clientContact

basic rules for Firebase, will modify:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User roles collection - only admins can write
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Daily diary - all authenticated users can read, but only certain roles can write
    match /daily/{entryId} {
      allow read: if request.auth != null;
      allow create: if isAdmin() || isSupervisor();
      allow update, delete: if isAdmin() || isSupervisor() || isDeveloper();
    }
    
    // Payment diary - more restricted
    match /payment/{entryId} {
      allow read: if isAdmin() || isSupervisor();
      allow write: if isAdmin();
    }
    
    // Worksheets - developers have more access
    match /worksheets/{entryId} {
      allow read: if request.auth != null;
      allow create: if isAdmin() || isSupervisor() || isDeveloper();
      allow update, delete: if isAdmin() || isSupervisor() || isDeveloper();
    }
    
    // Helper functions for checking roles
    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }
    
    function isSupervisor() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "supervisor";
    }
    
    function isDeveloper() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "developer1" ||
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "developer2";
    }
  }
}
*/