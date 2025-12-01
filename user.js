import { 
    auth, 
    onAuthStateChanged, 
    getUserData, 
    getUserPosts,
    toggleLike
} from './auth-service.js';

let currentUser = null;
let targetUserId = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Get User ID from URL (e.g. user.html?uid=12345)
    const urlParams = new URLSearchParams(window.location.search);
    targetUserId = urlParams.get('uid');

    if (!targetUserId) {
        alert("رابط غير صحيح");
        window.location.href = 'dashboard.html';
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            
            // If viewing own profile, redirect to the editable profile page
            if (currentUser.uid === targetUserId) {
                window.location.href = 'profile.html';
                return;
            }

            await loadTargetProfile();
        } else {
            // Allow viewing even if not logged in? Or force login?
            // For now, force login like the rest of the app
            window.location.href = 'login.html';
        }
    });
});

async function loadTargetProfile() {
    // 1. Load User Info
    const userRes = await getUserData(targetUserId);
    
    if (userRes.success) {
        const data = userRes.data;
        
        // Update DOM
        document.getElementById('visitUserName').textContent = data.fullName || 'زبون مجهول';
        document.getElementById('headerName').textContent = (data.fullName || 'الزبون').split(' ')[0]; // First name
        document.getElementById('visitUserEducation').textContent = data.educationLevel || 'زبون جديد';
        document.getElementById('visitUserBio').textContent = data.bio || 'أنا جديد في القهوة';
        
        // --- NEW: Update Role (Rank) ---
        const rankEl = document.getElementById('visitUserRank');
        if (rankEl) {
            rankEl.textContent = data.role || 'زبون';
        }

        const imgEl = document.getElementById('visitProfileImage');
        imgEl.src = data.profileImage || 'images/user.png';
        
        // Handle image error
        imgEl.onerror = () => { imgEl.src = 'images/user.png'; };
    } else {
        document.querySelector('main').innerHTML = `<div style="text-align:center; padding:3rem; color:red;"><h3>مش لاقيين الزبون ده!</h3></div>`;
        return;
    }

    // 2. Load User Posts
    const postsRes = await getUserPosts(targetUserId);
    const postsContainer = document.getElementById('visitUserPostsList');

    if (postsRes.success) {
        const posts = postsRes.data;
        
        // Calculate Stats
        const totalPosts = posts.length;
        let totalLikes = 0;
        posts.forEach(p => {
            if(p.likes) totalLikes += p.likes.length;
        });

        document.getElementById('visitTotalPosts').textContent = totalPosts;
        document.getElementById('visitTotalLikes').textContent = totalLikes;

        // Render Posts
        if (posts.length === 0) {
            postsContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-grey);">
                    <i class="fa-solid fa-wind" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>لسه منزلش أي مشاريب.</p>
                </div>
            `;
        } else {
            postsContainer.innerHTML = posts.map(post => createPostHTML(post)).join('');
            attachLikeListeners();
        }
    }
}

function createPostHTML(post) {
    // Check if current logged in user liked this post
    const isLiked = post.likes && currentUser && post.likes.includes(currentUser.uid);
    const likeCount = post.likes ? post.likes.length : 0;
    
    let timeAgo = "دلوقتي";
    if (post.timestamp) {
        const seconds = (new Date() - post.timestamp.toDate()) / 1000;
        if (seconds > 3600) timeAgo = `من ${Math.floor(seconds / 3600)} ساعة`;
        else if (seconds > 60) timeAgo = `من ${Math.floor(seconds / 60)} دقيقة`;
    }

    // Note: No Delete button here because it's another user's profile
    return `
        <div class="uni-card" id="post-${post.id}" style="border: 1px solid var(--border-color); padding: 1rem; margin-bottom: 1rem; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span style="color: var(--text-grey); font-size: 0.9rem;">${timeAgo}</span>
                </div>
            </div>
            
            <p style="white-space: pre-wrap; margin-bottom: 1rem;">${escapeHtml(post.content)}</p>
            
            <div style="display: flex; gap: 15px; font-size: 0.9rem; color: var(--text-grey); border-top: 1px solid #eee; padding-top: 10px;">
                <div class="compare-check like-btn ${isLiked ? 'active' : ''}" data-id="${post.id}" style="cursor: pointer;">
                    <i class="fa-${isLiked ? 'solid' : 'regular'} fa-thumbs-up"></i>
                    <span>${likeCount > 0 ? likeCount + ' واجب' : 'واجب'}</span>
                </div>
            </div>
        </div>
    `;
}

function attachLikeListeners() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const postId = this.dataset.id;
            const icon = this.querySelector('i');
            const span = this.querySelector('span');
            let count = parseInt(span.textContent) || 0;
            
            if (this.classList.contains('active')) {
                this.classList.remove('active');
                icon.classList.remove('fa-solid');
                icon.classList.add('fa-regular');
                if(span.textContent.includes('واجب') && count > 0) count--; 
            } else {
                this.classList.add('active');
                icon.classList.remove('fa-regular');
                icon.classList.add('fa-solid');
                count++;
            }
            span.textContent = count > 0 ? count + ' واجب' : 'واجب';

            await toggleLike(postId);
        });
    });
}

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}