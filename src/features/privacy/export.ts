import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { AppError } from '@/lib/errors';

import { exportMyData } from './api';

/** Creates a real file and opens the native save/share sheet. */
export async function shareMyDataExport(): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new AppError('unknown', 'privacy.exportUnavailable');
  }

  const data = await exportMyData();
  const date = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `unumae-data-${date}.json`);
  file.create({ overwrite: true, intermediates: true });
  file.write(JSON.stringify(data, null, 2));

  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
    });
  } finally {
    // A copy explicitly saved by the person remains at its chosen destination;
    // the temporary cache source should not linger on the device.
    file.delete();
  }
}
