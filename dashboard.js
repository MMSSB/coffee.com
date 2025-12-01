import { 
    auth, 
    onAuthStateChanged, 
    createPost, 
    getPosts, 
    toggleLike,
    deletePost
} from './auth-service.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            const avatar = document.getElementById('userAvatarSmall');
            // Welcome text is handled by greetings.js now, safe to skip here
            
            if(avatar) avatar.src = user.photoURL || 'images/user.png';
        } else {
            window.location.href = 'login.html';
        }
        loadFeed();
    });

    const publishBtn = document.getElementById('publishBtn');
    if(publishBtn) publishBtn.addEventListener('click', handlePublish);
    
    const postInput = document.getElementById('postInput');
    if(postInput) {
        postInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handlePublish();
        });
    }
});

async function handlePublish() {
    const input = document.getElementById('postInput');
    const content = input.value.trim();
    const btn = document.getElementById('publishBtn');

    if (!content) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const result = await createPost(content);

    if (result.success) {
        input.value = ''; 
        await loadFeed(); 
    } else {
        alert("حصلت مشكلة: " + result.error);
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> انشر';
}

async function loadFeed() {
    const feedContainer = document.getElementById('postsFeed');
    if(!feedContainer) return;

    const result = await getPosts();

    if (result.success) {
        const posts = result.data;
        
        if (posts.length === 0) {
            feedContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-grey);">
                    <i class="fa-solid fa-mug-hot" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3>القهوة فاضية!</h3>
                    <p>كن أول واحد ينزل مشاريب النهاردة</p>
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = posts.map(post => createPostHTML(post)).join('');
        attachPostListeners();

    } else {
        feedContainer.innerHTML = `<p style="color:red; text-align:center;">حصل خطأ في تحميل المشاريب</p>`;
    }
}

function createPostHTML(post) {
    const isLiked = post.likes && currentUser && post.likes.includes(currentUser.uid);
    const likeCount = post.likes ? post.likes.length : 0;
    const isAuthor = currentUser && post.authorId === currentUser.uid;
    
    let timeAgo = "دلوقتي";
    if (post.timestamp) {
        const seconds = (new Date() - post.timestamp.toDate()) / 1000;
        if (seconds > 3600) timeAgo = `من ${Math.floor(seconds / 3600)} ساعة`;
        else if (seconds > 60) timeAgo = `من ${Math.floor(seconds / 60)} دقيقة`;
    }

    // --- Link to User Profile ---
    // If it's me, go to profile.html, else go to user.html?uid=...
    const profileLink = isAuthor 
        ? 'profile.html' 
        : `user.html?uid=${post.authorId}`;

    return `
        <div class="uni-card" id="post-${post.id}">
            <div class="uni-content">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    
                    <!-- User Info Section (Clickable) -->
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 1rem;">
                        <a href="${profileLink}" style="text-decoration: none; display: flex; gap: 10px; align-items: center;">
                            <img src="${post.authorImage}" style="width: 45px; height: 45px; border-radius: 50%; border: 2px solid var(--border-color); object-fit: cover;">
                            <div>
                                <h2 style="margin: 0; font-size: 1rem; color: var(--primary-blue); cursor: pointer;">
                                    ${post.authorName}
                                </h2>
                                <span class="location" style="font-size: 0.8rem; color: var(--text-grey); display: block;">${timeAgo}</span>
                            </div>
                        </a>
                    </div>

                    ${isAuthor ? `
                        <button class="btn-outline delete-btn" data-id="${post.id}" style="border:none; color: #c5221f; padding: 5px;">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
                
                <p class="description" style="white-space: pre-wrap;">${escapeHtml(post.content)}</p>
            </div>
            
            <div class="card-actions">
                <div class="compare-check like-btn ${isLiked ? 'active' : ''}" data-id="${post.id}" style="cursor: pointer;">
                    <i class="fa-${isLiked ? 'solid' : 'regular'} fa-thumbs-up"></i>
                    <span>${likeCount > 0 ? likeCount + ' واجب' : 'واجب'}</span>
                </div>
                <div class="compare-check" style="cursor: not-allowed; opacity: 0.6;">
                    <i class="fa-regular fa-comment"></i>
                    <span>تلقيح</span>
                </div>
            </div>
        </div>
    `;
}

function attachPostListeners() {
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

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            if(confirm("متأكد انك عايز تمسح الكلام ده؟")) {
                const postId = this.dataset.id;
                const result = await deletePost(postId);
                if(result.success) {
                    const postEl = document.getElementById(`post-${postId}`);
                    if(postEl) postEl.remove();
                }
            }
        });
    });
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}