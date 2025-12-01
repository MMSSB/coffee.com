import { 
    auth, 
    onAuthStateChanged, 
    getUserData, 
    getUserPosts, 
    deletePost
} from './auth-service.js';

let currentUser = null;
let userData = null;

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
            await loadUserStatsAndPosts();
        } else {
            window.location.href = 'login.html';
        }
    });
});

async function loadUserData() {
    const result = await getUserData(currentUser.uid);
    if (result.success) {
        userData = result.data;
        updateProfileInfo(); // Updated function name
    }
}

function updateProfileInfo() {
    // 1. Sidebar Info
    const imgEl = document.getElementById('profileImage');
    const nameEl = document.getElementById('userName');
    const eduEl = document.getElementById('userEducation');
    const emailEl = document.getElementById('userEmail');
    const bioEl = document.getElementById('userBio');

    if(imgEl) imgEl.src = userData.profileImage || 'images/user.png';
    if(nameEl) nameEl.textContent = userData.fullName || 'الزبون';
    if(eduEl) eduEl.textContent = userData.educationLevel || 'زبون جديد';
    if(bioEl) bioEl.textContent = userData.bio || 'أنا جديد في القهوة';
    if(emailEl) emailEl.textContent = currentUser.email;

    // 2. Update Rank (Role) from Firebase
    const rankEl = document.getElementById('userRank');
    if(rankEl) {
        // Defaults to 'زبون' if role is missing in DB
        rankEl.textContent = userData.role || 'زبون'; 
    }
}

async function loadUserStatsAndPosts() {
    const postsListEl = document.getElementById('userPostsList');
    
    // Fetch posts
    const result = await getUserPosts(currentUser.uid);

    if (result.success) {
        const posts = result.data;
        
        // Calculate Stats
        const totalPosts = posts.length;
        let totalLikes = 0;
        posts.forEach(p => {
            if(p.likes) totalLikes += p.likes.length;
        });

        document.getElementById('totalPosts').textContent = totalPosts;
        document.getElementById('totalLikes').textContent = totalLikes;
        if(document.getElementById('postsCountBadge')) {
            document.getElementById('postsCountBadge').textContent = totalPosts;
        }

        // Render Posts
        if (posts.length === 0) {
            postsListEl.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 2rem;">
                    <i class="fa-solid fa-mug-saucer" style="font-size: 3rem; color: var(--border-color); margin-bottom: 1rem;"></i>
                    <h3>لسه منزلش حاجة</h3>
                    <p>روح الصالة ونزل أول بوست ليك</p>
                    <button class="btn-primary" onclick="window.location.href='dashboard.html'" style="margin-top: 1rem;">
                        روح الصالة
                    </button>
                </div>
            `;
        } else {
            postsListEl.innerHTML = posts.map(post => `
                <div class="uni-card" id="post-${post.id}" style="border: 1px solid var(--border-color); padding: 1rem; margin-bottom: 1rem; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: var(--text-grey); font-size: 0.9rem;">
                             ${post.timestamp ? new Date(post.timestamp.toDate()).toLocaleDateString('ar-EG') : 'دلوقتي'}
                        </span>
                        <button class="btn-danger-light delete-btn" data-id="${post.id}" style="padding: 2px 8px; font-size: 0.8rem; color:red; background-color: transparent; border: none;">
                            <i class="fa-solid fa-trash" style="font-size: 15px;"></i> 
                        </button>
                    </div>
                    <p style="white-space: pre-wrap; margin-bottom: 1rem;">${escapeHtml(post.content)}</p>
                    <div style="display: flex; gap: 15px; font-size: 0.9rem; color: var(--text-grey);">
                        <span><i class="fa-solid fa-thumbs-up"></i> ${post.likes ? post.likes.length : 0} واجب</span>
                    </div>
                </div>
            `).join('');

            // Delete Logic
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    if(confirm("عايز تمسح البوست ده؟")) {
                        const pid = this.dataset.id;
                        await deletePost(pid);
                        document.getElementById(`post-${pid}`).remove();
                        const currentCount = parseInt(document.getElementById('totalPosts').textContent);
                        document.getElementById('totalPosts').textContent = Math.max(0, currentCount - 1);
                    }
                });
            });
        }
    } else {
        postsListEl.innerHTML = `<p style="color:red">حصل خطأ في تحميل البوستات</p>`;
    }
}

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}