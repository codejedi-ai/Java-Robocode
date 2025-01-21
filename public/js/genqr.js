const qrDiv = document.getElementById('qrcode');
const textInput = document.getElementById('text');

function generateQR() {
    qrDiv.innerHTML = '';
    if (textInput.value) {
        const qr = qrcode(0, 'L');
        qr.addData(textInput.value);
        qr.make();
        qrDiv.innerHTML = qr.createImgTag(5);
    }
}

function downloadQR() {
    const img = qrDiv.querySelector('img');
    if (img) {
        const link = document.createElement('a');
        link.download = 'qrcode.png';
        link.href = img.src;
        link.click();
    }
}

textInput.addEventListener('input', generateQR);
generateQR(); // Initial generation