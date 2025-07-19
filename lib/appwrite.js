// services/appwrite.js
import { Client, Avatars,Account, Databases, ID, Query } from "react-native-appwrite";
import Constants from "expo-constants";

export const appwriteConfig = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT,
  platform: "com.crypto.news",
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  latestCollectionId: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID,
  editorsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_EDITORS_COLLECTION_ID,
  userCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USER_COLLECTION_ID // Use the prefixed variable
};

// ——— Initialize Appwrite SDK ———
const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

const account = new Account(client);
const databases = new Databases(client);
const avatars = new Avatars(client);


// ——— Auth functions ———

/** Sign up, then create the user’s profile doc */
export async function createUser(email, password, username) {
  // 1. Register account
  const newAccount = await account.create(ID.unique(), email, password, username);

  // 2. Auto-login
  await signIn(email, password);

  const avatarUrl = avatars.getInitials(username);
  // 3. Create profile in `users` collection
  return databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    ID.unique(),
    {
      accountId: newAccount.$id,
      email,
      username,
      avatar: avatarUrl, // you can let users upload later
    }
  );
}

/** Sign in with email + password */
export async function signIn(email, password) {
  return account.createEmailPasswordSession(email, password);
}

/** Get the currently logged-in user’s profile doc */
export async function getCurrentUser() {
  const acct = await account.get();
  const res = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    [Query.equal("accountId", acct.$id)]
  );
  return res.documents[0] || null;
}

/** Sign out */
export function signOut() {
  return account.deleteSession("current");
}

// ——— Article-fetching functions ———

/** Fetch all “latest” articles (up to 50) */
export async function fetchLatestArticles(limit = 50, offset = 0) {
  const res = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.latestCollectionId,
    [Query.orderDesc("$createdAt")],
    limit,
    offset
  );
  return res.documents;
}

/** Fetch “Editor’s Picks” */
export async function fetchEditorsPick(limit = 50, offset = 0) {
  const res = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.editorsCollectionId,
    [Query.orderDesc("$createdAt")],
    limit,
    offset
  );
  return res.documents;
}

/** Search articles by title */
export async function searchArticles(term) {
  const res = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.latestCollectionId,
    [Query.search("title", term)]
  );
  return res.documents;
}

export async function saveBookmark(articleId, user) {
  // 1. grab whatever’s in user.articlesBookmarked
  const raw = user.articlesBookmarked || [];
console.log(raw);

  // 2. normalize everything to just IDs
  const currentIds = raw.map(item =>
    typeof item === 'string'
      ? item
      : item.$id || item.id || ''      // adjust if your ID field is named differently
  ).filter(id => id);                   // drop any falsy entries

  console.log('existing bookmark IDs:', currentIds);

  // 3. if it’s not already bookmarked, add it
  const updatedIds = currentIds.includes(articleId)
    ? currentIds
    : [...currentIds, articleId];

  console.log('updated bookmark IDs:', updatedIds);

  // 4. write back just the array of strings
  const res = await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    user.$id,
    { articlesBookmarked: updatedIds }
  );

  return res;
}


/** Remove an article from the current user’s bookmarks */
export async function removeBookmark(articleId, user) {

  // 1. grab the raw bookmark list
  const raw = user.articlesBookmarked || [];
  console.log(raw);
  

  // 2. normalize to IDs only
  const currentIds = raw
    .map(item =>
      typeof item === 'string'
        ? item
        : item.$id || item.id || ''    // adjust if your ID field is named differently
    )
    .filter(id => id);                // drop any falsy values

  console.log('existing bookmark IDs:', currentIds);

  // 3. filter out the one to remove
  const updatedIds = currentIds.filter(id => id !== articleId);

  console.log('updated bookmark IDs:', updatedIds);

  // 4. persist only the array of strings
  const res = await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    user.$id,
    { articlesBookmarked: updatedIds }
  );

  return res;
}


/** Fetch the articles bookmarked by the current user */
export async function fetchBookmarkedArticles(limit = 50, offset = 0) {
  const user = await getCurrentUser();
  if (!user?.bookmarks?.length) return [];
  const res = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.latestCollectionId,
    [Query.equal("$id", user.bookmarks)],
    limit,
    offset
  );
  return res.documents;
}


export function searchPosts(
  query = '',
  offset = 0,
  limit = 10
) {
  const filters = [];

  // full-text search on title if non-empty
  if (query.trim()) {
    filters.push(Query.search('title', query.trim()));
  }

  // newest first
  filters.push(Query.orderDesc('$createdAt'));

  // pagination
  filters.push(Query.limit(limit));
  filters.push(Query.offset(offset));

  return databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.latestCollectionId,
    filters
  );
}