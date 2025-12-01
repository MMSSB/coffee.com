// auth-service.js
import { app } from './firebase-config.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    deleteUser
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    updateDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    deleteDoc,
    orderBy,
    serverTimestamp,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// --- User Management ---

async function signUp(email, password, fullName) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const photoURL = 'images/user.png'; 
        
        await updateProfile(user, { displayName: fullName, photoURL: photoURL });

        await setDoc(doc(db, "users", user.uid), {
            fullName: fullName,
            email: email,
            role: "زبون", 
            createdAt: serverTimestamp(),
            educationLevel: "طالب",
            bio: "أنا جديد في القهوة"
        });

        return { success: true, user: user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function logout() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getUserData(uid) {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) return { success: true, data: docSnap.data() };
        return { success: false, error: "User not found" };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function updateUserProfile(data) {
    const user = auth.currentUser;
    if(!user) return { success: false, error: "Not logged in" };
    try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, data);
        
        const updates = {};
        if (data.profileImage) updates.photoURL = data.profileImage;
        if (data.fullName) updates.displayName = data.fullName;
        if (Object.keys(updates).length > 0) await updateProfile(user, updates);

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function deleteUserAccount() {
    const user = auth.currentUser;
    if (!user) return { success: false, error: "No user" };
    try {
        await deleteDoc(doc(db, "users", user.uid));
        await deleteUser(user);
        return { success: true };
    } catch (error) {
        if(error.code === 'auth/requires-recent-login') return { success: false, error: "requires-recent-login" };
        return { success: false, error: error.message };
    }
}

// --- Posts System ---

async function createPost(content) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: "Login required" };

    try {
        const postData = {
            authorId: user.uid,
            authorName: user.displayName || "Unknown",
            authorImage: user.photoURL || "images/user.png",
            content: content,
            timestamp: serverTimestamp(),
            likes: [], 
            commentsCount: 0
        };
        await addDoc(collection(db, "posts"), postData);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getPosts() {
    try {
        const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const posts = [];
        querySnapshot.forEach((doc) => posts.push({ id: doc.id, ...doc.data() }));
        return { success: true, data: posts };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// --- NEW FUNCTION: Get Posts for Specific User (For Profile) ---
async function getUserPosts(uid) {
    try {
        // Requires Index in Firestore usually, but basic query works if small data
        const q = query(
            collection(db, "posts"), 
            where("authorId", "==", uid),
            orderBy("timestamp", "desc")
        );
        const querySnapshot = await getDocs(q);
        const posts = [];
        querySnapshot.forEach((doc) => posts.push({ id: doc.id, ...doc.data() }));
        return { success: true, data: posts };
    } catch (error) {
        // Fallback if index missing: Get all and filter in JS (Not recommended for prod but fixes error)
        if(error.message.includes("index")) {
            console.warn("Missing Index, filtering client side");
            const all = await getPosts();
            if(all.success) {
                return { success: true, data: all.data.filter(p => p.authorId === uid) };
            }
        }
        return { success: false, error: error.message };
    }
}

async function toggleLike(postId) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: "Login required" };
    try {
        const postRef = doc(db, "posts", postId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
            const likes = postSnap.data().likes || [];
            if (likes.includes(user.uid)) {
                await updateDoc(postRef, { likes: arrayRemove(user.uid) });
            } else {
                await updateDoc(postRef, { likes: arrayUnion(user.uid) });
            }
            return { success: true };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function deletePost(postId) {
    try {
        await deleteDoc(doc(db, "posts", postId));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export {
    auth,
    db,
    signUp,
    login,
    logout,
    getUserData,
    updateUserProfile,
    deleteUserAccount,
    onAuthStateChanged,
    createPost,
    getPosts,
    getUserPosts, // <--- Exported
    toggleLike,
    deletePost
};