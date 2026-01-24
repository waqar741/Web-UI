import { API_BASE } from '$lib/utils/app-paths';

export class FileService {
    /**
     * Uploads a file to the server and returns the server-side file path.
     * @param file The file to upload
     * @returns Promise resolving to the server-side file path
     */
    static async uploadFile(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/v1/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Failed to upload file: ${response.statusText}`);
        }

        // Expecting JSON response with a 'path' or similar field
        // Adjust this based on actual backend response structure
        const data = await response.json();

        if (typeof data.path === 'string') {
            return data.path;
        } else if (typeof data.file_path === 'string') {
            return data.file_path;
        }

        throw new Error('Invalid response format from upload endpoint');
    }
}
