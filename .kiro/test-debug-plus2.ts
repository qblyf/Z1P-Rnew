const input = 'IQOO Z10 Turbo+ 12GB+256GB 黑色';
console.log('Input:', input);
console.log('Char codes around Turbo:');
for (let i = 10; i < 20; i++) {
  console.log(`  [${i}]: '${input[i]}' (${input.charCodeAt(i)})`);
}

// Check if there's actually a + after Turbo
const turboIndex = input.indexOf('Turbo');
console.log('\nTurbo index:', turboIndex);
console.log('After Turbo:', input.substring(turboIndex, turboIndex + 10));
