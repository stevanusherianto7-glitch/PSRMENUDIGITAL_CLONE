/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI CONFIG CAPACITOR UNTUK NATIVE ANDROID/IOS PAWON SALAM.
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN FITUR HARDWARE (PRINTER/SCAN) TIDAK JALAN. ⚠️
 */
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kedaielvera57.pos',
  appName: 'Kedai Elvera 57 POS',
  webDir: 'dist',
  cordova: {
    preferences: {
      'BluetoothSerial': '0.4.7'
    },
    plugins: {
      'cordova-plugin-bluetooth-serial': {}
    }
  }
};

export default config;
