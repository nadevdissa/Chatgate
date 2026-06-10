const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const ringtoneScript = path.join(__dirname, 'generate-ringtone.js');

require('child_process').execFileSync(process.execPath, [ringtoneScript], { stdio: 'inherit' });

fs.mkdirSync(dist, { recursive: true });

['index.html', 'script.js', 'calls.js', 'style.css', 'favicon.svg', 'ringtone.wav', 'discord-notification.mp3'].forEach((file) => {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
});

console.log('Copied static frontend to dist/');
