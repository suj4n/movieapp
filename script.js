const API_URL = 'https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&api_key=3fd2be6f0c70a2a598f084ddfb75487c&page=1'
const IMG_PATH = 'https://image.tmdb.org/t/p/w1280'
const SEARCH_API = 'https://api.themoviedb.org/3/search/movie?api_key=3fd2be6f0c70a2a598f084ddfb75487c&query="'
const GENRE_API = 'https://api.themoviedb.org/3/genre/movie/list?api_key=3fd2be6f0c70a2a598f084ddfb75487c&language=en-US'

const main = document.getElementById('main')
const form = document.getElementById('form')
const search = document.getElementById('search')
const year = document.getElementById('year')
const genre = document.getElementById('genre')
const actor = document.getElementById('actor')
const director = document.getElementById('director')

// Populate genres
fetch(GENRE_API)
    .then(res => res.json())
    .then(data => {
        data.genres.forEach(g => {
            const option = document.createElement('option')
            option.value = g.id
            option.textContent = g.name
            genre.appendChild(option)
        })
    })

let lastUrl = '';
let currentPage = 1;
let totalPages = 1;

// Get initial movies
getMovies(API_URL)

async function getMovies(url) {
    lastUrl = url;
    const res = await fetch(url + (url.includes('?') ? '&' : '?') + `page=${currentPage}`);
    const data = await res.json();

    showMovies(data.results)

    // Set total pages for pagination
    totalPages = data.total_pages || 1;
    showPagination();
}

function showMovies(movies) {
    main.innerHTML = ''

    movies.forEach((movie) => {
        const { id, title, poster_path, vote_average, overview } = movie

        const movieEl = document.createElement('div')
        movieEl.classList.add('movie')
        movieEl.dataset.id = id

        movieEl.innerHTML = `
            <img src="${IMG_PATH + poster_path}" alt="${title}">
            <div class="movie-info">
                <h3>${title}</h3>
                <span class="${getClassByRate(vote_average)}">${vote_average}</span>
            </div>
        `
        main.appendChild(movieEl)
    })
}

// Modal for movie description
async function showMovieModal(movie) {
    // Remove existing modal if any
    const existingModal = document.getElementById('movie-modal')
    if (existingModal) existingModal.remove()

    // Prevent background scroll
    document.body.style.overflow = 'hidden'

    // Fetch credits for cast, crew info
    const creditsRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=3fd2be6f0c70a2a598f084ddfb75487c`)
    const credits = await creditsRes.json()

    // Get top 5 cast
    const castList = credits.cast ? credits.cast.slice(0, 5).map(c => c.name).join(', ') : 'N/A'
    // Get directors
    const directors = credits.crew ? credits.crew.filter(c => c.job === 'Director').map(c => c.name).join(', ') : 'N/A'
    // Get writers (Screenplay, Writer, Story)
    const writers = credits.crew ? credits.crew.filter(c => ['Screenplay', 'Writer', 'Story'].includes(c.job)).map(c => c.name).filter((v, i, a) => a.indexOf(v) === i).join(', ') : 'N/A'

    const modal = document.createElement('div')
    modal.id = 'movie-modal'

    modal.innerHTML = `
        <div class="modal-content">
            <button id="close-modal" aria-label="Close">&times;</button>
            <h2>${movie.title}</h2>
            <p><strong>Release Date:</strong> ${movie.release_date || 'N/A'}</p>
            <p><strong>Rating:</strong> ${movie.vote_average}</p>
            <img src="${IMG_PATH + movie.poster_path}" alt="${movie.title}">
            <h3>Overview</h3>
            <p>${movie.overview}</p>
            <h3>Cast</h3>
            <p>${castList}</p>
            <h3>Director(s)</h3>
            <p>${directors || 'N/A'}</p>
            <h3>Writer(s)</h3>
            <p>${writers || 'N/A'}</p>
        </div>
    `
    document.body.appendChild(modal)

    document.getElementById('close-modal').onclick = () => {
        modal.remove()
        document.body.style.overflow = ''
    }
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove()
            document.body.style.overflow = ''
        }
    }
}

// Listen for clicks on movies to show description modal
main.addEventListener('click', async (e) => {
    const movieEl = e.target.closest('.movie')
    if (movieEl) {
        const movieId = movieEl.dataset.id
        const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=3fd2be6f0c70a2a598f084ddfb75487c`)
        const movie = await res.json()
        await showMovieModal(movie)
    }
})

function getClassByRate(vote) {
    if(vote >= 8) {
        return 'green'
    } else if(vote >= 5) {
        return 'orange'
    } else {
        return 'red'
    }
}

// Helper to get person ID by (partial) name, returns a comma-separated list of IDs for top 3 matches
async function getPersonIds(name) {
    const res = await fetch(`https://api.themoviedb.org/3/search/person?api_key=3fd2be6f0c70a2a598f084ddfb75487c&query=${encodeURIComponent(name)}`)
    const data = await res.json()
    if (data.results && data.results.length > 0) {
        // Return up to 3 matching IDs for partial matches
        return data.results.slice(0, 3).map(person => person.id).join(',')
    }
    return ''
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const searchTerm = search.value.trim();
    const yearVal = year.value.trim();
    const genreVal = genre.value;
    const actorVal = actor.value.trim();
    const directorVal = director.value.trim();

    let url = '';
    currentPage = 1; // Always reset to first page on new search

    // If movie name is provided, always use /search/movie
    if (searchTerm) {
        url = `https://api.themoviedb.org/3/search/movie?api_key=3fd2be6f0c70a2a598f084ddfb75487c&query=${encodeURIComponent(searchTerm)}`;
        const res = await fetch(url + `&page=${currentPage}`);
        const data = await res.json();
        let results = data.results;

        // Now filter client-side for year, genre, etc.
        if (yearVal) {
            results = results.filter(movie => movie.release_date && movie.release_date.startsWith(yearVal));
        }
        if (genreVal) {
            results = results.filter(movie => movie.genre_ids && movie.genre_ids.includes(Number(genreVal)));
        }

        // For actor and director, you would need to fetch credits for each movie (API limitation)
        // This can be slow, so you may want to show a warning or limit this feature

        showMovies(results);
        totalPages = 1;
        showPagination();
    } else {
        // Use discover for filters only
        url = 'https://api.themoviedb.org/3/discover/movie?api_key=3fd2be6f0c70a2a598f084ddfb75487c&sort_by=popularity.desc';
        if (yearVal) url += `&primary_release_year=${encodeURIComponent(yearVal)}`;
        if (genreVal) url += `&with_genres=${encodeURIComponent(genreVal)}`;

        if (actorVal) {
            const actorIds = await getPersonIds(actorVal);
            if (actorIds) url += `&with_cast=${actorIds}`;
        }
        if (directorVal) {
            const directorIds = await getPersonIds(directorVal);
            if (directorIds) url += `&with_crew=${directorIds}`;
        }

        getMovies(url);
    }
})

// Show pagination controls
function showPagination() {
    // Remove old pagination if exists
    let pagination = document.getElementById('pagination');
    if (pagination) pagination.remove();

    pagination = document.createElement('div');
    pagination.id = 'pagination';
    pagination.style.display = 'flex';
    pagination.style.justifyContent = 'center';
    pagination.style.margin = '2rem 0';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            getMovies(lastUrl);
        }
    };
    pagination.appendChild(prevBtn);

    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.textContent = ` Page ${currentPage} of ${totalPages} `;
    pageInfo.style.color = '#fff';
    pageInfo.style.margin = '0 1rem';
    pagination.appendChild(pageInfo);

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            getMovies(lastUrl);
        }
    };
    pagination.appendChild(nextBtn);

    // Insert after main
    main.parentNode.insertBefore(pagination, main.nextSibling);
}

// Home link resets page
document.getElementById('home-link').onclick = () => {
    currentPage = 1;
    getMovies(API_URL);
};