const input = 'IQOO Z10 Turbo+ 12GB+256GB 黑色';
console.log('Input:', input);

// Test the updated pattern
const fullModelPattern = /\b((?:[A-Z][a-z]*)?(\d+)(?:[A-Z])?(?:\s+(?:Pro|Max|Mini|Plus|Ultra|SE|Air|Turbo|Lite|Note|Edge|Fold|Flip|X|S|R|T|GT|RS|Neo|Ace)(?:\+)?)*)/i;
const match = input.match(fullModelPattern);

console.log('Match:', match);
if (match) {
  console.log('Full match:', match[0]);
  console.log('Group 1:', match[1]);
  console.log('Group 2:', match[2]);
}
