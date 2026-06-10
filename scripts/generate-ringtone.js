const fs = require('fs');
const path = require('path');

const sampleRate = 22050;
const duration = 2.4;
const samples = Math.floor(sampleRate * duration);
const pcm = Buffer.alloc(samples * 2);

for (let i = 0; i < samples; i += 1) {
  const t = i / sampleRate;
  const burst = Math.floor(t / 0.55) % 2 === 0;
  const env = burst ? Math.min(1, Math.min(t % 0.55, 0.55 - (t % 0.55)) * 8) : 0;
  const tone =
    Math.sin(2 * Math.PI * 523.25 * t) * 0.55 + Math.sin(2 * Math.PI * 659.25 * t) * 0.4;
  const sample = Math.max(-1, Math.min(1, tone * env * 0.45));
  pcm.writeInt16LE(Math.round(sample * 32767), i * 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

const out = path.join(__dirname, '..', 'ringtone.wav');
fs.writeFileSync(out, Buffer.concat([header, pcm]));
console.log('Generated ringtone.wav');
