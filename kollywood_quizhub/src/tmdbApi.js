//
// TMDB API integration utilities for Kollywood QuizHub
//
// Uses the TMDB v3 API to fetch Kollywood (Tamil-language) movie data for quiz/game logic.
// Provides both generic helpers and Kollywood-focused queries/reusable hooks.
//

const TMDB_API_KEY = "5bc67d3b06aecbd18121a3cbbc16eb59";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TAMIL_LANGUAGE_CODE = "ta-IN";

// PUBLIC_INTERFACE
/**
 * Fetch wrapper for TMDB GET requests.
 * Handles API key and query params.
 * @param {string} endpoint - API endpoint (relative to v3)
 * @param {object} params - Query params as key-value pairs
 * @returns {Promise<object>} Parsed JSON response
 */
export async function tmdbFetch(endpoint, params = {}) {
  // Build query string with api_key
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append("api_key", TMDB_API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`TMDB API error: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

// PUBLIC_INTERFACE
/**
 * Search movies by title, filtered for Kollywood (Tamil) language movies.
 * @param {string} query - Movie title or keyword
 * @param {number} [page=1] - Page number for results
 * @returns {Promise<object>} List of movies (paginated)
 */
export function searchKollywoodMovies(query, page = 1) {
  return tmdbFetch("/search/movie", {
    query,
    page,
    with_original_language: "ta", // Focus on Tamil
    // Optionally filter more via 'region' if needed
  });
}

// PUBLIC_INTERFACE
/**
 * Discover popular or trending Kollywood (Tamil) movies, sorted by popularity.
 * @param {number} [page=1] - Page number
 * @returns {Promise<object>} List of Tamil movies (paginated)
 */
export function discoverKollywoodMovies(page = 1) {
  return tmdbFetch("/discover/movie", {
    sort_by: "popularity.desc",
    with_original_language: "ta",
    page,
    // Optionally add 'primary_release_date.gte/lte' to narrow by year/etc.
  });
}

// PUBLIC_INTERFACE
/**
 * Fetch detailed movie info by TMDB movie ID
 * @param {number|string} movieId
 * @returns {Promise<object>} Movie details
 */
export function getMovieDetails(movieId) {
  return tmdbFetch(`/movie/${movieId}`, { language: TAMIL_LANGUAGE_CODE });
}

// PUBLIC_INTERFACE
/**
 * React hook to fetch & cache Kollywood movies for QuizHub
 * Usage: const { loading, movies, error, reload } = useKollywoodMovies({ query, page })
 * @param {{query?: string, page?: number}} options - Query search or popular, and page
 * @returns {object} loading, movies, error, reload
 */
import { useState, useEffect, useCallback } from "react";
export function useKollywoodMovies({ query = "", page = 1 } = {}) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fetcher = useCallback(() => {
    setLoading(true);
    setError("");
    const prom = query
      ? searchKollywoodMovies(query, page)
      : discoverKollywoodMovies(page);
    prom
      .then((res) => setMovies(res.results || []))
      .catch((err) => setError(err.message || "Error fetching movies"))
      .finally(() => setLoading(false));
  }, [query, page]);
  useEffect(() => {
    fetcher();
  }, [fetcher]);
  return { loading, movies, error, reload: fetcher };
}
