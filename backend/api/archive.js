import { getJSON, postJSON, uploadFile } from '../utils/client.js';

export const getFiles    = (params = '')   => getJSON(`read.php${params}`);
export const getFile     = (id)            => getJSON(`read.php?id=${id}`);
export const createFile  = (formData)      => uploadFile('create.php', formData);
export const updateFile  = (id, data)      => postJSON(`update.php?id=${id}`, data, 'PUT');
export const deleteFile  = (id, role)      => postJSON(`delete.php?id=${id}&role=${role}`, {});
export const restoreFile = (id, role)      => postJSON(`delete.php?id=${id}&role=${role}&action=restore`, {});
