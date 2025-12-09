import numpy as np
from PIL import Image
try:
    import tflite_runtime.interpreter as tflite
except ImportError:
    import tensorflow as tf
    tflite = tf.lite

import tempfile
import requests
from django.conf import settings
import os

# ================================
# Load TFLite Models
# ================================

MODEL_CLASSIFIER = os.path.join(settings.BASE_DIR, "models_tflite/date_palm_classifier_final_INT8.tflite")
MODEL_DETECTOR   = os.path.join(settings.BASE_DIR, "models_tflite/palm_detector_INT8.tflite")

# Classifier interpreter
classifier_interpreter = tf.lite.Interpreter(model_path=MODEL_CLASSIFIER)
classifier_interpreter.allocate_tensors()
classifier_input  = classifier_interpreter.get_input_details()
classifier_output = classifier_interpreter.get_output_details()

# Detector interpreter
detector_interpreter = tf.lite.Interpreter(model_path=MODEL_DETECTOR)
detector_interpreter.allocate_tensors()
detector_input    = detector_interpreter.get_input_details()
detector_output   = detector_interpreter.get_output_details()


# ================================
# Image Preprocessing
# ================================
def preprocess_image(image_path):
    img = Image.open(image_path).convert("RGB")
    img = img.resize((224, 224))
    img = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(img, axis=0)


# ================================
# Prediction Functions
# ================================
def predict_classification(image_path):
    img = preprocess_image(image_path)

    classifier_interpreter.set_tensor(classifier_input[0]['index'], img)
    classifier_interpreter.invoke()

    result = classifier_interpreter.get_tensor(classifier_output[0]['index'])
    return result


def predict_detection(image_path):
    img = preprocess_image(image_path)

    detector_interpreter.set_tensor(detector_input[0]['index'], img)
    detector_interpreter.invoke()

    result = detector_interpreter.get_tensor(detector_output[0]['index'])
    return result

# ---------------------------
# تعريف الكلاسات
# ---------------------------

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


# ---------------------------
# دالة التصنيف
# ---------------------------

def is_palm_leaf(django_file):
    """يرجع True إذا كانت الصورة نخلة، False إذا لم تكن نخلة"""

    img = Image.open(django_file).convert("RGB").resize((224, 224))
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = np.expand_dims(arr, axis=0)

    pred = palm_check_model.predict(arr)[0][0]  # sigmoid output

    print("Palm Detector Output:", pred)

    return pred >= 0.5   # 0.5 threshold


def classify_image(django_file):

    # 1) التحقق أولاً: هل الصورة نخلة؟
    if not is_palm_leaf(django_file):
        return {"not_palm": True}

    # 2) إذا نخلة → تحليل الأمراض
    img = Image.open(django_file).convert("RGB").resize((224, 224))
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = np.expand_dims(arr, axis=0)

    preds = model.predict(arr)[0]
    sorted_idx = np.argsort(preds)[::-1]

    top_idx = int(sorted_idx[0])
    top_class_en = CLASSES_EN[top_idx]
    top_class_ar = CLASSES_AR[top_class_en]
    top_confidence = float(preds[top_idx])

    classes_list = []
    for idx in sorted_idx:
        class_en = CLASSES_EN[int(idx)]
        classes_list.append({
            "name": CLASSES_AR[class_en],
            "confidence": float(preds[idx]),
        })

    return {
        "predicted_class": top_class_ar,
        "confidence": top_confidence,
        "classes": classes_list,
    }

