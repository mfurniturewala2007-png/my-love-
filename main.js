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

    // Helper to update a song link element + mini player
    function setSongLink(el, songMemory, idKey, playerSuffix) {
        const playerEl  = document.getElementById(`mini-player-${playerSuffix}`);
        const artEl     = document.getElementById(`mini-art-${playerSuffix}`);
        const audioEl   = document.getElementById(`mini-audio-${playerSuffix}`);
        const playBtn   = document.getElementById(`mini-play-${playerSuffix}`);

        if (songMemory && songMemory.description) {
            // Try to parse as JSON (new format), fall back to plain text
            let name = songMemory.description;
            let previewUrl = null;
            let artUrl = null;
            try {
                const parsed = JSON.parse(songMemory.description);
                name = parsed.name || name;
                previewUrl = parsed.preview || null;
                artUrl = parsed.art || null;
            } catch(e) { /* plain text, fine */ }

            const query = encodeURIComponent(name);
            el.textContent = name;
            el.href = `https://open.spotify.com/search/${query}`;
            el.target = '_blank';
            el.style.cursor = 'pointer';
            el.style.color = '';
            window[idKey] = songMemory.id;

            // Setup mini player if we have a preview
            if (previewUrl && playerEl) {
                artEl.src = artUrl || '';
                audioEl.src = previewUrl;
                playerEl.style.display = 'flex';

                // Play/pause helper
                function playAudio() {
                    document.querySelectorAll('.mini-player audio').forEach(a => a.pause());
                    document.querySelectorAll('.mini-player-art').forEach(a => a.classList.remove('playing'));
                    document.querySelectorAll('.mini-play-btn').forEach(b => b.textContent = '▶');
                    audioEl.play();
                    artEl.classList.add('playing');
                    playBtn.textContent = '⏸';
                }
                function pauseAudio() {
                    audioEl.pause();
                    artEl.classList.remove('playing');
                    playBtn.textContent = '▶';
                }

                // Hover to play (desktop)
                const songCard = playerEl.closest('.song-card');
                if (songCard) {
                    songCard.addEventListener('mouseenter', playAudio);
                    songCard.addEventListener('mouseleave', pauseAudio);
                }

                // Click button for mobile
                playBtn.onclick = () => {
                    if (audioEl.paused) { playAudio(); } else { pauseAudio(); }
                };

                audioEl.onended = () => {
                    artEl.classList.remove('playing');
                    playBtn.textContent = '▶';
                };
            } else if (playerEl) {
                playerEl.style.display = 'none';
            }
        } else {
            el.textContent = 'No song set yet ♪';
            el.removeAttribute('href');
            el.target = '';
            el.style.cursor = 'default';
            el.style.color = '#aaa';
            if (playerEl) playerEl.style.display = 'none';
        }
    }

    const mohammedSong = data.find(m => m.title === '__SONG_MOHAMMED__');
    const husainaSong  = data.find(m => m.title === '__SONG_HUSAINA__');
    setSongLink(document.getElementById('song-link-mohammed'), mohammedSong, 'currentSongIdMohammed', 'mohammed');
    setSongLink(document.getElementById('song-link-husaina'),  husainaSong,  'currentSongIdHusaina',  'husaina');

    const songTitles = ['__FAV_SONG__', '__SONG_MOHAMMED__', '__SONG_HUSAINA__'];
    const regularMemories = data.filter(m => !songTitles.includes(m.title));

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

// Track which person's song we are editing
let editingSongFor = null;

function openSongModal(person) {
    editingSongFor = person;
    document.getElementById('song-modal-overlay').style.display = 'flex';
    document.getElementById('song-search-input').value = '';
    document.getElementById('song-search-results').innerHTML = '';
    setTimeout(() => document.getElementById('song-search-input').focus(), 100);
}

document.getElementById('btn-edit-song-mohammed').addEventListener('click', () => openSongModal('mohammed'));
document.getElementById('btn-edit-song-husaina').addEventListener('click',  () => openSongModal('husaina'));

document.getElementById('btn-song-cancel').addEventListener('click', () => {
    document.getElementById('song-modal-overlay').style.display = 'none';
});

// Live search using iTunes Search API (free, no API key needed)
let searchTimeout = null;
document.getElementById('song-search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    const resultsEl = document.getElementById('song-search-results');

    if (query.length < 2) {
        resultsEl.innerHTML = '';
        return;
    }

    resultsEl.innerHTML = '<p class="song-searching">Searching...</p>';

    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=8`);
            const json = await response.json();
            
            if (!json.results || json.results.length === 0) {
                resultsEl.innerHTML = '<p class="song-searching">No songs found. Try a different name.</p>';
                return;
            }

            resultsEl.innerHTML = '';
            json.results.forEach(track => {
                const item = document.createElement('div');
                item.className = 'song-result-item';
                item.innerHTML = `
                    <img src="${track.artworkUrl100}" alt="Album art">
                    <div class="song-result-info">
                        <strong>${track.trackName}</strong>
                        <span>${track.artistName}</span>
                    </div>
                `;
                item.addEventListener('click', async () => {
                    const songName = `${track.trackName} — ${track.artistName}`;
                    // Store as JSON to include preview and art for the mini player
                    const songData = JSON.stringify({
                        name: songName,
                        preview: track.previewUrl || null,
                        art: track.artworkUrl100 || null
                    });
                    const spotifyQuery = encodeURIComponent(`${track.trackName} ${track.artistName}`);
                    const spotifyUrl = `https://open.spotify.com/search/${spotifyQuery}`;

                    const titleKey = editingSongFor === 'husaina' ? '__SONG_HUSAINA__' : '__SONG_MOHAMMED__';
                    const idKey    = editingSongFor === 'husaina' ? 'currentSongIdHusaina' : 'currentSongIdMohammed';

                    // Save to database
                    if (window[idKey]) {
                        await supabase.from('memories').update({ description: songData }).eq('id', window[idKey]);
                    } else {
                        await supabase.from('memories').insert([{ title: titleKey, description: songData, image_url: '' }]);
                    }

                    // Also save a history record using just the song name (readable)
                    const histKey = editingSongFor === 'husaina' ? '__HIST_HUSAINA__' : '__HIST_MOHAMMED__';
                    await supabase.from('memories').insert([{ title: histKey, description: songName, image_url: '' }]);

                    // Close modal and refresh
                    document.getElementById('song-modal-overlay').style.display = 'none';
                    fetchMemories();
                    fetchSongHistory();

                    // Open Spotify in new tab
                    window.open(spotifyUrl, '_blank');
                });
                resultsEl.appendChild(item);
            });
        } catch (err) {
            resultsEl.innerHTML = '<p class="song-searching">Error searching. Check your connection.</p>';
        }
    }, 500);
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
fetchSongHistory();

// ==========================================
// 5. SONG HISTORY
// ==========================================
async function fetchSongHistory() {
    const { data, error } = await supabase
        .from('memories')
        .select('*')
        .in('title', ['__HIST_MOHAMMED__', '__HIST_HUSAINA__'])
        .order('created_at', { ascending: false });

    if (error || !data) return;

    function renderHistory(listEl, items) {
        listEl.innerHTML = '';
        if (items.length === 0) {
            listEl.innerHTML = '<li style="color:#aaa">No history yet</li>';
            return;
        }
        items.forEach(item => {
            const date = new Date(item.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
            const query = encodeURIComponent(item.description);
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="https://open.spotify.com/search/${query}" target="_blank">${item.description}</a>
                <span>${date}</span>
            `;
            listEl.appendChild(li);
        });
    }

    const mohammedHistory = data.filter(m => m.title === '__HIST_MOHAMMED__');
    const husainaHistory  = data.filter(m => m.title === '__HIST_HUSAINA__');

    renderHistory(document.getElementById('song-history-mohammed'), mohammedHistory);
    renderHistory(document.getElementById('song-history-husaina'),  husainaHistory);
}

// Toggle History panel
document.getElementById('btn-song-history').addEventListener('click', () => {
    const panel = document.getElementById('song-history-panel');
    const btn   = document.getElementById('btn-song-history');
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
    btn.textContent = isHidden ? '📖 Hide Song History' : '📖 View Song History';
});
