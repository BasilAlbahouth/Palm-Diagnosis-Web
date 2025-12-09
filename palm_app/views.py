import logging
import os

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST

# استدعاء دوال الـ ML الجديدة من ml.py
from .ml import predict_classification, predict_detection

logger = logging.getLogger(__name__)


# الصفحة الرئيسية
def index(request):
    return render(request, 'palm_app/index.html')


# صفحة اختبار
def test(request):
    return render(request, 'test123.html')


# صفحة رفع الصورة
def analyze(request):
    return render(request, 'palm_app/analyze.html')


# API للتحليل
@require_POST
def analyze_api(request):
    image = request.FILES.get("image")

    if not image:
        return JsonResponse({"error": "يرجى اختيار صورة لتحليلها."}, status=400)

    try:
        # حفظ الملف في مجلد مؤقت
        temp_path = "temp_image.jpg"
        with open(temp_path, "wb+") as f:
            for chunk in image.chunks():
                f.write(chunk)

        # -------------------------
        # تشغيل الموديلات TFLite
        # -------------------------

        # 1) الموديل الخاص بالكشف عن نخيل/غير نخيل
        detection_output = predict_detection(temp_path)

        # detection_output عبارة عن مصفوفة احتمالات → نأخذ القيمة الأولى
        is_palm_prob = float(detection_output[0][0])

        # لو ليست نخلة
        if is_palm_prob < 0.5:
            return JsonResponse({
                "error": "❌ الصورة ليست سعف نخيل. الرجاء رفع صورة واضحة للسعف."
            }, status=400)

        # 2) تشغيل موديل التصنيف
        classification_output = predict_classification(temp_path)
        classification_output = classification_output[0]  # flatten

        # أعلى class
        top_idx = int(classification_output.argmax())
        confidence = float(classification_output[top_idx])

        # أسماء الكلاسات (نفس الموجود في ml.py)
        CLASSES_EN = [
            "CLASS_00_Healthy",
            "CLASS_01_Pest_WhiteScale",
            "CLASS_02_Pest_Dubas_Bug",
            "CLASS_03_Pest_Dubas_Symptom",
            "CLASS_04_Disease_BrownSpot_Graphiola",
            "CLASS_05_Disease_LeafSpot_Generic",
            "CLASS_06_Disease_BlackScorch",
            "CLASS_07_Disease_FusariumWilt",
            "CLASS_08_Disease_RachisBlight",
            "CLASS_09_Deficiency_K",
            "CLASS_10_Deficiency_Mn",
            "CLASS_11_Deficiency_Mg",
        ]

        CLASSES_AR = {
            "CLASS_00_Healthy": "سليمة",
            "CLASS_01_Pest_WhiteScale": "الحشرة القشرية البيضاء",
            "CLASS_02_Pest_Dubas_Bug": "حشرة الدُبّاس",
            "CLASS_03_Pest_Dubas_Symptom": "أعراض حشرة الدُبّاس",
            "CLASS_04_Disease_BrownSpot_Graphiola": "تبقّع بني (جرافيولا)",
            "CLASS_05_Disease_LeafSpot_Generic": "تبقّع الأوراق (عام)",
            "CLASS_06_Disease_BlackScorch": "اللفحة السوداء",
            "CLASS_07_Disease_FusariumWilt": "ذبول الفيوزاريوم",
            "CLASS_08_Disease_RachisBlight": "لفحة العرجون",
            "CLASS_09_Deficiency_K": "نقص البوتاسيوم",
            "CLASS_10_Deficiency_Mn": "نقص المنغنيز",
            "CLASS_11_Deficiency_Mg": "نقص المغنيسيوم",
        }

        predicted_class = CLASSES_AR[CLASSES_EN[top_idx]]

        result = {
            "predicted_class": predicted_class,
            "confidence": confidence
        }

        return JsonResponse(result)

    except Exception as e:
        logger.exception("Palm diagnosis failed.")
        return JsonResponse({"error": "حدث خطأ أثناء تنفيذ النموذج."}, status=500)
