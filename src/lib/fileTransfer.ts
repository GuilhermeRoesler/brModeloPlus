import { PROJECT_FILE_MAX_BYTES } from '../config/limits';
import { ProjectFileError } from './projectFile';

/** Dispara download de um arquivo de texto no navegador. */
export const downloadTextFile = (
  filename: string,
  content: string,
  mimeType = 'application/json',
) => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (file.size > PROJECT_FILE_MAX_BYTES) {
      reject(
        new ProjectFileError(
          `Arquivo muito grande (máx. ${Math.floor(PROJECT_FILE_MAX_BYTES / (1024 * 1024))} MB).`,
        ),
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () =>
      reject(reader.error ?? new Error('Falha ao ler o arquivo.'));
    reader.readAsText(file);
  });
