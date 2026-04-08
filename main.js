import './style.css'
import { createClient } from '@supabase/supabase-js'

// ==========================================
// CONFIGURATION: SUPABASE CREDENTIALS
// ==========================================
const SUPABASE_URL = 'https://raqbjjawbofdsyamqquj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhcWJqamF3Ym9mZHN5YW1xcXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MjgzMTYsImV4cCI6MjA5MTIwNDMxNn0.W7LKdeCoZVeX_EhLVkP_cYXETTFzhoUNNEStBUnezNg';
        
const SECRET_PASSCODE = 'husaina123';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 1. ADMIN MODE AUTHENTICATION
// ==========================================
let isAdmin = false;
let tapCount = 0;
let tapTimer = null;

document.getElementById('secret-trigger').addEventListener('click', () => {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 1500);

    if (tapCount >= 3) {
        tapCount = 0;
        if (!isAdmin) promptAdmin();
    }
});

function promptAdmin() {
    const pass = prompt("Enter the secret passcode to unlock Edit Mode:");
    if (pass === SECRET_PASSCODE) {
        isAdmin = true;
        document.getElementById('admin-controls').classList.add('active');
        document.body.classList.add('admin-active');
        alert("Unlocked!");
    } else if (pass != null) {
        alert("Incorrect passcode!");
    }
}

document.getElementById('btn-logout').addEventListener('click', () => {
    isAdmin = false;
    document.getElementById('admin-controls').classList.remove('active');
    document.body.classList.remove('admin-active');
});

// ==========================================
// 2. FETCH AND DISPLAY MEMORIES
// ==========================================
async function fetchMemories() {
    const loadingEl = document.getElementById('loading');
    const grid = document.getElementById('photo-grid');
    
    loadingEl.style.display = 'block';
    grid.innerHTML = '';

    const { data, error } = await supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: true });

    loadingEl.style.display = 'none';

    if (error) {
        console.error("Error fetching memories:", error);
        grid.innerHTML = `<p>Error loading memories. Check console.</p>`;
        return;
    }

    // Separate the special song memory
    const songMemory = data.find(m => m.title === '__FAV_SONG__');
    const songLinkEl = document.getElementById('song-link');
    if (songMemory && songMemory.description) {
        const query = encodeURIComponent(songMemory.description);
        songLinkEl.textContent = songMemory.description;
        songLinkEl.href = `https://open.spotify.com/search/${query}`;
        songLinkEl.target = '_blank';
        songLinkEl.onclick = (e) => {
            e.preventDefault();
            const appLink = `spotify:search:${songMemory.description}`;
            const webLink = `https://open.spotify.com/search/${query}`;
            // Use hidden iframe to attempt opening Spotify app without navigating away
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = appLink;
            document.body.appendChild(iframe);
            setTimeout(() => document.body.removeChild(iframe), 2000);
            // Always open Spotify web search in a new tab as well
            window.open(webLink, '_blank');
        };
        window.currentSongId = songMemory.id;
    } else {
        songLinkEl.textContent = "Tap to add a favourite song!";
        songLinkEl.href = "javascript:void(0)";
        songLinkEl.onclick = null;
    }

    const regularMemories = data.filter(m => m.title !== '__FAV_SONG__');

    regularMemories.forEach((memory, index) => {
        const card = document.createElement('div');
        card.className = 'photo-card reveal visible'; 
        card.innerHTML = `
            <button class="card-delete-btn" onclick="deleteMemory('${memory.id}', '${memory.image_url}')">Delete</button>
            <button class="card-edit-btn" onclick="openEditModal('${memory.id}', '${escapeHtml(memory.title)}', '${escapeHtml(memory.description)}')">Edit</button>
            ${memory.title ? `<h3 class="photo-card-heading brand-font">${escapeHtml(memory.title)}</h3>` : ''}
            <div class="img-wrapper">
                <img src="${memory.image_url}" alt="Memory">
            </div>
            <p class="photo-caption">${escapeHtml(memory.description)}</p>
        `;
        
         // Detect shape of image to span 2 columns if landscape
         const img = card.querySelector('img');
         img.onload = () => {
             if (img.naturalWidth > img.naturalHeight) {
                 card.classList.add('landscape');
             }
         };

         grid.appendChild(card);
    });

    // Initialize SortableJS
    if (window.Sortable) {
        new window.Sortable(grid, {
            animation: 250,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            delay: 150, 
            delayOnTouchOnly: true
        });
    }
}

function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================
// 3. UPLOAD & EDIT LOGIC
// ==========================================
const modalOverlay = document.getElementById('memory-modal-overlay');
const modalStatus = document.getElementById('modal-status');
let isEditMode = false;

// ==========================================
// LIGHTBOX LOGIC
// ==========================================
const lightboxOverlay = document.getElementById('lightbox-overlay');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxClose = document.getElementById('lightbox-close');

window.openLightbox = function(imageUrl) {
    lightboxImg.src = imageUrl;
    lightboxOverlay.classList.add('active');
}

lightboxClose.addEventListener('click', () => {
    lightboxOverlay.classList.remove('active');
});

lightboxOverlay.addEventListener('click', (e) => {
    if (e.target !== lightboxImg) {
        lightboxOverlay.classList.remove('active');
    }
});

document.getElementById('btn-add-memory').addEventListener('click', () => {
    isEditMode = false;
    document.getElementById('modal-title').innerText = "Add New Memory";
    document.getElementById('file-group').style.display = "block";
    
    document.getElementById('memory-title').value = '';
    document.getElementById('memory-desc').value = '';
    document.getElementById('memory-file').value = '';
    document.getElementById('memory-id').value = '';
    modalStatus.innerText = '';
    
    modalOverlay.style.display = 'flex';
});

document.getElementById('btn-edit-song').addEventListener('click', async () => {
    const newSong = prompt("Enter your new favourite song (e.g. 'Perfect Ed Sheeran'):");
    if (!newSong) return;

    if (window.currentSongId) {
        await supabase.from('memories').update({ description: newSong }).eq('id', window.currentSongId);
    } else {
        await supabase.from('memories').insert([{ title: '__FAV_SONG__', description: newSong, image_url: '' }]);
    }
    
    fetchMemories();
});

// Since we are in a module, we attach it to window so inline onclick can see it
window.openEditModal = function (id, title, desc) {
    isEditMode = true;
    document.getElementById('modal-title').innerText = "Edit Memory";
    document.getElementById('file-group').style.display = "none";
    
    document.getElementById('memory-id').value = id;
    document.getElementById('memory-title').value = title;
    document.getElementById('memory-desc').value = desc;
    modalStatus.innerText = '';

    modalOverlay.style.display = 'flex';
}

window.deleteMemory = async function (id, imageUrl) {
    if (!confirm("Are you sure you want to completely delete this memory?")) return;

    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) {
        alert("Failed to delete memory: " + error.message);
        return;
    }

    if (imageUrl) {
        const parts = imageUrl.split('/');
        const fileName = parts[parts.length - 1]; // e.g. hjh3k.jpg
        // The file is stored in 'memories/hj3k.jpg' path inside 'images' bucket
        await supabase.storage.from('images').remove([`memories/${fileName}`]);
    }
    
    fetchMemories();
}

document.getElementById('btn-cancel').addEventListener('click', () => {
    modalOverlay.style.display = 'none';
});

document.getElementById('btn-save').addEventListener('click', async () => {
    const title = document.getElementById('memory-title').value;
    const desc = document.getElementById('memory-desc').value;
    const fileInput = document.getElementById('memory-file');

    modalStatus.innerText = "Saving... please wait.";

    if (isEditMode) {
        const id = document.getElementById('memory-id').value;
        const { error } = await supabase
            .from('memories')
            .update({ title: title, description: desc })
            .eq('id', id);

        if (error) {
            modalStatus.innerText = "Error: " + error.message;
        } else {
            modalOverlay.style.display = 'none';
            fetchMemories();
        }
    } else {
        if (fileInput.files.length === 0) {
            modalStatus.innerText = "Please select an image!";
            return;
        }
        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `memories/${fileName}`;

        modalStatus.innerText = "Uploading image...";
        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, file);

        if (uploadError) {
            modalStatus.innerText = "Upload failed: " + uploadError.message;
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(filePath);

        modalStatus.innerText = "Saving data...";
        const { error: dbError } = await supabase
            .from('memories')
            .insert([{
                title: title,
                description: desc,
                image_url: publicUrl
            }]);

        if (dbError) {
            modalStatus.innerText = "Save failed: " + dbError.message;
        } else {
            modalOverlay.style.display = 'none';
            fetchMemories();
        }
    }
});

// ==========================================
// 4. ANIMATIONS & TIMER 
// ==========================================
function initAnimations() {
    const bgContainer = document.getElementById('bg-flowers');
    const petalCount = 20;

    for (let i = 0; i < petalCount; i++) {
        const petal = document.createElement('div');
        petal.classList.add('flower-petal');
        petal.innerHTML = `<svg viewBox="0 0 24 24" fill="#ff4d4d" style="width:100%; height:100%;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
        const size = Math.random() * 15 + 15;
        const leftPos = Math.random() * 100;
        const delay = Math.random() * 15;
        const duration = Math.random() * 15 + 20;

        petal.style.width = size + 'px';
        petal.style.height = size + 'px';
        petal.style.left = leftPos + 'vw';
        petal.style.animationDelay = '-' + delay + 's';
        petal.style.animationDuration = duration + 's';
        bgContainer.appendChild(petal);
    }

    const startDate = new Date('2025-12-23T00:00:00');
    function updateTimer() {
        const now = new Date();
        let timeDiff = now.getTime() - startDate.getTime();
        if (timeDiff < 0) timeDiff = 0;
        const msInDay = 1000 * 60 * 60 * 24;
        const msInHour = 1000 * 60 * 60;
        const msInMinute = 1000 * 60;
        document.getElementById('days').textContent = Math.floor(timeDiff / msInDay);
        document.getElementById('hours').textContent = Math.floor((timeDiff % msInDay) / msInHour);
        document.getElementById('minutes').textContent = Math.floor((timeDiff % msInHour) / msInMinute);
    }
    updateTimer();
    setInterval(updateTimer, 60000);

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));
}

// Start everything up safely
initAnimations();
fetchMemories();
