// analyze.js
document.addEventListener("DOMContentLoaded", () => {

    /* =============================================================
       عناصر الواجهة
    ============================================================= */
    const cameraBtn = document.getElementById("cameraBtn");
    const uploadBtn = document.getElementById("uploadBtn");
    const cameraInput = document.getElementById("cameraInput");
    const fileInput = document.getElementById("fileInput");
    // عناصر الشات
    const chatBtn = document.getElementById("openChatbot");
    const chatPanel = document.getElementById("chatbotPanel");
    const chatClose = document.getElementById("closeChatbot");
    const chatForm = document.getElementById("chatbotForm");
    const chatInput = document.getElementById("chatbotText");
    const chatMessages = document.getElementById("chatbotMessages");

    /* قاعدة بيانات وصف الأمراض */
    const DISEASE_INFO = {
        "سليمة": {
            type: "healthy",
            title: "سليمة",
            description: "سعف أخضر متجانس خالٍ من البقع..."
        },
        "تبقّع بني (جرافيولا)": {
            type: "disease",
            title: "تبقّع بني (جرافيولا – Graphiola)",
            description: "بقع صفراء صغيرة تتحول لبقع بنية..."
        },
        "لفحة العرجون": {
            type: "disease",
            title: "لفحة العرجون",
            description: "اسوداد وجفاف مفاجئ في العرجون..."
        },
        "اللفحة السوداء": {
            type: "disease",
            title: "اللفحة السوداء (Black scorch)",
            description: "خطوط وبقع سوداء كأنها محترقة..."
        },
        "ذبول الفيوزاريوم": {
            type: "disease",
            title: "ذبول الفيوزاريوم (Fusarium wilt)",
            description: "اصفرار وذبول نصف تاج النخلة..."
        },
        "نقص المنغنيز": {
            type: "disease",
            title: "نقص المنغنيز (Mn)",
            description: "اصفرار بين العروق في السعف الحديث..."
        },
        "حشرة الدُبّاس": {
            type: "disease",
            title: "حشرة الدُبّاس",
            description: "حشرة ماصّة تغطي السعف بندوة عسلية..."
        },
        "الحشرة القشرية البيضاء": {
            type: "disease",
            title: "الحشرة القشرية البيضاء",
            description: "حراشف بيضاء صغيرة تمتص العصارة..."
        },
        "أعراض حشرة الدُبّاس": {
            type: "disease",
            title: "أعراض حشرة الدُبّاس",
            description: "بقع باهتة مع عفن أسود (سخامي)..."
        },
        "نقص البوتاسيوم": {
            type: "disease",
            title: "نقص البوتاسيوم (K)",
            description: "اصفرار وجفاف تدريجي لأطراف الوريقات..."
        },
        "نقص المغنيسيوم": {
            type: "disease",
            title: "نقص المغنيسيوم (Mg)",
            description: "اصفرار في أطراف الوريقات..."
        },
        "تبقّع الأوراق (عام)": {
            type: "disease",
            title: "تبقّع الأوراق (Leaf spots)",
            description: "بقع بنية أو رمادية على الخوص..."
        }
    };

    /* =============================================================
       أدوات عامة
    ============================================================= */
    function fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(file);
        });
    }

    function getCsrfToken() {
        const match = document.cookie.match(/csrftoken=([^;]+)/i);
        return match ? match[1] : "";
    }

    function percent(value) {
        return `${Math.round(value * 100)}%`;
    }

    /* =============================================================
       مودال النتيجة
    ============================================================= */
    function buildResultModal() {
        const wrap = document.createElement("div");
        wrap.className = "result-modal";
        wrap.innerHTML = `
            <div class="result-dialog">
                <button class="result-close" aria-label="إغلاق">✕</button>
                <div id="resultContent">
                    <div class="modal-loading">
                        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                        <span>جاري التحليل…</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(wrap);

        wrap.querySelector(".result-close").addEventListener("click", () => wrap.remove());
        wrap.addEventListener("click", (e) => { if (e.target === wrap) wrap.remove(); });

        return wrap;
    }

    function renderResultModal(wrap, imageURL, html) {
        wrap.querySelector("#resultContent").innerHTML = `
            <div class="result-grid">
                <div class="result-left">
                    <h3 class="res-title">الصورة المرفوعة</h3>
                    <div class="res-image"><img src="${imageURL}"></div>
                </div>
                <div class="result-right">${html}</div>
            </div>
        `;
    }

    /* =============================================================
       بطاقات النتيجة
    ============================================================= */

    function classTable(classes = []) {
        if (!classes.length) return `<div class="res-row">لا توجد بيانات</div>`;

        return classes
            .map((c, i) => `
                <div class="res-row ${i === 0 ? "primary" : ""}">
                    <span>${c.name}</span>
                    <span>${percent(c.confidence)}</span>
                </div>
            `)
            .join("");
    }

    function successCard(result) {
    const info = DISEASE_INFO[result.predicted_class];

    return `
        <div class="res-card success">
            <div class="res-icon">🌴</div>

            <!-- عنوان المرض -->
            <div class="res-heading">${info?.title || result.predicted_class}</div>

            <!-- وصف المرض -->
            <p class="res-desc">${info?.description || "لا يوجد وصف متاح لهذا المرض."}</p>

            <!-- درجة الثقة -->
            <div class="res-accuracy">
                <div class="res-acc-head">
                    <span>درجة الثقة</span>
                    <span>${percent(result.confidence)}</span>
                </div>
                <div class="res-bar">
                    <span class="res-fill" style="width:${percent(result.confidence)}"></span>
                </div>
            </div>

            <!-- جدول الثقة لكل الفئات -->
            <div class="res-table">
                <div class="res-table-head"><span>الفئة</span><span>الثقة</span></div>
                ${classTable(result.classes)}
            </div>
        </div>
    `;
}


    // بطاقة إذا الصورة ليست نخلة
   function notPalmCard() {
    return `
        <div class="res-card danger">
            <div class="res-icon">🌴❌</div>
            <div class="res-heading">الصورة ليست لنخلة أو غير واضحة</div>
            <p class="res-desc">
                الرجاء رفع صورة سعف نخيل واضحة ليتمكن النظام من تحليلها.
            </p>
        </div>
    `;
}

    function errorCard(msg) {
        return `
            <div class="res-card danger">
                <div class="res-icon">⚠️</div>
                <div class="res-heading">خطأ في التحليل</div>
                <p class="res-desc">${msg}</p>
            </div>
        `;
    }

    /* =============================================================
       الطلب إلى الـ API
    ============================================================= */
    async function uploadForAnalysis(file) {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("/api/analyze/", {
            method: "POST",
            body: formData,
            headers: {
                "X-CSRFToken": getCsrfToken()
            },
            credentials: "same-origin"
        });

        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error || "تعذر تحليل الصورة.");

        return json;
    }

    /* =============================================================
       تشغيل التحليل
    ============================================================= */
    async function runAnalysis(file) {
        const modal = buildResultModal();
        const imageURL = await fileToDataURL(file);

        try {
            const result = await uploadForAnalysis(file);

            // تحقق هل الصورة ليست نخلة
            if (result.not_palm) {
                renderResultModal(modal, imageURL, notPalmCard());
                return;
            }

            // نجاح التحليل
            renderResultModal(modal, imageURL, successCard(result));

        } catch (err) {
            renderResultModal(modal, imageURL, errorCard(err.message));
        }
    }

    /* =============================================================
       الكاميرا
    ============================================================= */
    function buildCameraModal() {
        const modal = document.createElement("div");
        modal.className = "cam-modal";
        modal.innerHTML = `
            <div class="cam-dialog">
                <video autoplay muted playsinline></video>
                <div class="cam-actions">
                    <button class="cam-btn" data-close>إلغاء</button>
                    <button class="cam-btn primary" data-capture>التقاط</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    function stopStream(stream) {
        stream?.getTracks().forEach(t => t.stop());
    }

    async function openCamera() {
        if (!navigator.mediaDevices?.getUserMedia) return cameraInput.click();

        const modal = buildCameraModal();
        const video = modal.querySelector("video");
        const closeBtn = modal.querySelector("[data-close]");
        const captureBtn = modal.querySelector("[data-capture]");

        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
            video.srcObject = stream;
        } catch {
            modal.remove();
            return cameraInput.click();
        }

        function close() {
            stopStream(stream);
            modal.remove();
        }

        closeBtn.addEventListener("click", close);
        modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

        captureBtn.addEventListener("click", () => {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext("2d").drawImage(video, 0, 0);
            canvas.toBlob(blob => {
                runAnalysis(new File([blob], "camera.jpg"));
                close();
            }, "image/jpeg", 0.9);
        });
    }
    /* الشات الجانبي */
    function appendMessage(text, sender = "user") {
        if (!chatMessages) return;
        const wrap = document.createElement("div");
        wrap.className = `chat-msg ${sender}`;
        wrap.innerHTML = `<div class="msg-bubble">${text}</div>`;
        chatMessages.appendChild(wrap);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    chatBtn?.addEventListener("click", () => {
        chatPanel?.classList.add("open");
        setTimeout(() => chatInput?.focus(), 150);
    });

    chatClose?.addEventListener("click", () => {
        chatPanel?.classList.remove("open");
    });

    chatPanel?.addEventListener("click", (e) => {
        if (e.target === chatPanel) {
            chatPanel.classList.remove("open");
        }
    });

    chatForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = (chatInput?.value || "").trim();
        if (!text) return;

        appendMessage(text, "user");
        chatInput.value = "";

        setTimeout(() => {
            appendMessage(
                "تم استلام سؤالك 🌴. يمكن ربط هذا المساعد لاحقاً بنموذج ذكاء اصطناعي للإجابة تلقائياً عن أمراض وآفات النخيل.",
                "bot"
            );
        }, 500);
    });
    /* =============================================================
       الأحداث
    ============================================================= */
    cameraBtn?.addEventListener("click", e => { e.preventDefault(); openCamera(); });
    uploadBtn?.addEventListener("click", e => { e.preventDefault(); fileInput.click(); });
    cameraInput?.addEventListener("change", () => { if (cameraInput.files[0]) runAnalysis(cameraInput.files[0]); });
    fileInput?.addEventListener("change", () => { if (fileInput.files[0]) runAnalysis(fileInput.files[0]); });

});
