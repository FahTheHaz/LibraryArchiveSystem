// Central API base — set VITE_API_BASE in your .env for production.
// Default falls back to localhost for local development.
const API_ROOT = import.meta.env.VITE_API_BASE ?? "http://localhost/LAS/backend/api";

export const ACCOUNTS_BASE = `${API_ROOT}/accounts`;
export const CRUD_BASE     = `${API_ROOT}/crud`;
export const TAGS_BASE     = `${API_ROOT}/tags`;
export const ADMIN_BASE    = `${API_ROOT}/admin`;
