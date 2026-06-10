const canvas = document.createElement('canvas');
canvas.width = 192;
canvas.height = 192;
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, 192, 192);
ctx.fillStyle = '#FF1E27';
ctx.font = 'bold 80px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('DHW', 96, 96);
canvas.toBlob(blob => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'icon-192x192.png';
  link.click();
});
