"""
Local rule-based assistant for Sara's portfolio — no external AI service needed.
Answers only about Sara; anything else gets a polite refusal.
Add or edit topics in TOPICS below to "train" it.
"""

import re

EMAIL = "Saraalharbi0031@gmail.com"
PHONE = "+968 9453 5520"
LINKEDIN = "linkedin.com/in/sara-alharbi-1b53263a2"
GITHUB = "github.com/nooneinz"

# Each topic: keywords (Arabic/English, normalized) -> answer
TOPICS = [
    {
        "name": "contact",
        "keys": ["تواصل", "اتواصل", "ايميل", "بريد", "رقم", "linkedin", "لينكد", "قيت", "github", "contact", "email", "reach", "hire", "توظيف", "اوظف"],
        "answer": f"تقدر تتواصل مع سارة عبر:\n- البريد: {EMAIL}\n- رقم التواصل: {PHONE}\n- LinkedIn: {LINKEDIN}\n- GitHub: {GITHUB}",
    },
    {
        "name": "baseera",
        "keys": ["baseera", "بصيرة", "بصيره", "مدار", "engineer it"],
        "answer": "Baseera (يونيو 2026 – الآن): منصة B2B SaaS تعتمد على Agentic AI لتحويل بيانات المالية والمبيعات والمخزون إلى توصيات استراتيجية فورية. مبنية بـ Django (MVC) مع غلاف هجين للجوال، وREST APIs آمنة للتواصل بين الوكلاء، ونشر عبر GitHub وRender وCloudflare. شاركت بها في مسابقة \"Engineer It with AI\" التابعة لمؤسسة مدار.",
    },
    {
        "name": "retention",
        "keys": ["retention", "ريتنشن", "تسرب", "تسرّب", "طلاب", "cnn", "lstm", "94"],
        "answer": "RetentionAI: نظام تنبؤ بخطر تسرّب الطلاب بدقة 94.5% باستخدام نموذج CNN-LSTM هجين (TensorFlow)، مع Flask backend يدعم 3 أدوار (مدير، محاضر، طالب)، وقاعدة MySQL، ولوحات تحليل لحظية عبر API غير متزامن، ونشر آلي CI/CD على Render مع Gunicorn.",
    },
    {
        "name": "crm",
        "keys": ["crm", "ticketing", "تذاكر", "تذكره", "rbac", "فهارس", "indexing"],
        "answer": "Multi-Tier Ticketing & CRM Architecture: نظام خلفي لإدارة علاقات العملاء والتذاكر مع صلاحيات RBAC، حسّن زمن الاستعلامات بنسبة 25% عبر تحسين الفهارس، وعالج أكثر من 1,000 طلب دعم دون أخطاء توجيه.",
    },
    {
        "name": "projects",
        "keys": ["مشروع", "مشاريع", "اعمال", "project", "projects", "portfolio", "work", "بنت", "طورت", "taxi", "gold", "shoppers", "task manager"],
        "answer": "أبرز مشاريع سارة:\n- Baseera: منصة B2B SaaS بـ Agentic AI (Django).\n- RetentionAI: تنبؤ بتسرّب الطلاب بدقة 94.5% (CNN-LSTM).\n- Multi-Tier Ticketing & CRM: نظام تذاكر مع RBAC وتحسين استعلامات 25%.\n- مشاريع GitHub: NYC Taxi Tip Prediction, Predictive Car Features EDA, Online Shoppers Purchase Prediction, Gold Price Tracker Oman, Mini SaaS Task Manager.\nاسأليني عن أي مشروع بالتفصيل.",
    },
    {
        "name": "skills",
        "keys": ["مهارات", "مهاره", "مهارة", "تقني", "تقنيات", "لغات", "لغة", "برمج", "skill", "skills", "tech", "stack", "python", "django", "sql", "docker", "تجيد", "تعرف", "تتقن"],
        "answer": "المهارات التقنية لسارة:\n- الويب والـ APIs: Python, Django, ASP.NET Core, PHP, JavaScript, REST APIs, HTML5/CSS3.\n- قواعد البيانات: PostgreSQL, MySQL, تصميم المخططات العلائقية، تحسين الفهارس.\n- DevOps: Git, Docker, CI/CD, Render, Cloudflare, Nginx.\n- الذكاء الاصطناعي: Agentic AI, Machine Learning, Deep Learning (TensorFlow, CNN-LSTM).\n- هندسة البرمجيات: MVC, C4 Models, RBAC.",
    },
    {
        "name": "soft",
        "keys": ["شخصي", "soft", "فريق", "لغتين", "ثنائية", "تحليلي"],
        "answer": "المهارات الشخصية: التفكير التحليلي والنقدي، حل المشكلات المعقدة، سرعة التعلّم، العمل ضمن فرق متعددة التخصصات، كتابة التقارير التقنية، وثنائية اللغة (العربية والإنجليزية).",
    },
    {
        "name": "education",
        "keys": ["دراس", "تعليم", "مؤهل", "جامعه", "جامعة", "بكالوريوس", "تخرج", "تخصص", "كليه", "كلية", "امتياز", "education", "degree", "university", "study", "graduat", "cardiff", "كارديف", "الخليج"],
        "answer": "سارة حاصلة على بكالوريوس علوم الحاسوب والذكاء الاصطناعي من كلية الخليج (جامعة كارديف متروبوليتان)، 2021–2026، بتقدير امتياز مع مرتبة الشرف الأولى (First Class Honors).",
    },
    {
        "name": "certs",
        "keys": ["شهاد", "دورات", "دوره", "كورس", "certificate", "certification", "course", "ibm", "google", "kaggle", "michigan"],
        "answer": "شهادات سارة:\n- IBM: Make Agentic AI Work for You, Getting Started with Generative AI, Machine Learning with Python, Data Analysis with Python, Python for Data Science, Develop Generative AI Applications: Get Started, Cybersecurity Fundamentals, Build AI Agents using MCP, Agentic AI with LangGraph/CrewAI/AutoGen/BeeAI, Agentic AI with LangChain and LangGraph, Fundamentals of Building AI Agents, Advanced RAG with Vector Databases and Retrievers, Build RAG Applications: Get Started.\n- Google: Google AI Essentials, 5-Day AI Agents Intensive, Discover the Art of Prompting, Introduction to AI, Stay Ahead of the AI Curve, Maximize Productivity With AI Tools.\n- Kaggle: Machine Learning, Pandas, Python, Intro to Programming.\n- University of Michigan: Python Data Structures, Programming for Everybody.\n- معهد الناظر: شهادة في الذكاء الاصطناعي (AI Agents وAI Prompting).\n- Coursera: Google AI Essentials, أساسيات تحليل البيانات باستخدام جداول بيانات جوجل.",
    },
    {
        "name": "programs",
        "keys": ["معسكر", "برنامج", "مسابقه", "تدريب", "internship", "وزاره", "وزارة", "angular", "majan", "ريادة", "camp", "bootcamp", "competition", "هندسها"],
        "answer": "شاركت سارة في: مسابقة \"هندسها بالذكاء الاصطناعي الوكيل 2026\" من مؤسسة مدار (معسكر مكثف في Agentic AI)، ومعسكر ريادة الأعمال للمبتكرين (فئة التعليم الجامعي، 5 أيام)، وبرنامج Majan Programmers الذي بدأت فيه بأساسيات Angular. كما تدرّبت (Internship) في وزارة النقل والاتصالات وتقنية المعلومات من يوليو إلى سبتمبر 2026 في مجال تكنولوجيا المعلومات والذكاء الاصطناعي.",
    },
    {
        "name": "ai",
        "keys": ["ذكاء", "agentic", "وكلاء", "machine learning", "deep learning", "تعلم الة", "تعلم عميق", "tensorflow", "ai"],
        "answer": "سارة متخصصة في الذكاء الاصطناعي: Agentic AI (مشروع Baseera)، وMachine Learning وDeep Learning باستخدام TensorFlow (مشروع RetentionAI بنموذج CNN-LSTM بدقة 94.5%)، إضافة إلى شهادات من IBM وGoogle في المجال.",
    },
    {
        "name": "location",
        "keys": ["وين", "اين", "أين", "مكان", "تسكن", "تقيم", "مقيمه", "مقيمة", "مسقط", "عمان", "عُمان", "where", "location", "live", "based", "oman", "muscat"],
        "answer": "سارة مقيمة في مسقط، سلطنة عُمان.",
    },
    {
        "name": "experience",
        "keys": ["خبره", "خبرة", "وظيف", "تعمل", "عمل", "شغل", "منصب", "experience", "job", "role", "position", "مهندسه", "مهندسة"],
        "answer": "تدرّبت سارة (Internship) في وزارة النقل والاتصالات وتقنية المعلومات (يوليو–سبتمبر 2026). وتعمل حالياً على مشروع Baseera (منذ يونيو 2026)، وهي منصة B2B SaaS تعتمد على Agentic AI. كما بنت RetentionAI ونظام Multi-Tier Ticketing & CRM.",
    },
    {
        "name": "who",
        "keys": ["من هي", "من هى", "مين", "عرفني", "نبذه", "نبذة", "عنها", "about", "who", "introduce", "سارة", "sara", "سارا"],
        "answer": "سارة صالح الحربي، متخصصة في تقنية المعلومات مع تركيز على الذكاء الاصطناعي وتعلّم الآلة وتحليل البيانات بـ Python، وشغوفة بتحويل البيانات إلى حلول ذكية واستكشاف مستقبل الذكاء الاصطناعي. أبرز مهاراتها: Data Analysis, Machine Learning, AI, Data Visualization, Pandas & NumPy. وتخصصها الذكاء الاصطناعي، ومقيمة في مسقط – عُمان. خريجة علوم الحاسوب والذكاء الاصطناعي بمرتبة الشرف الأولى، وتعمل على Baseera منصة B2B SaaS بـ Agentic AI. اسأليني عن مشاريعها أو مهاراتها أو شهاداتها.",
    },
]

GREETINGS = ["مرحبا", "اهلا", "أهلا", "السلام", "هلا", "hi", "hello", "hey", "صباح", "مساء"]
GREETING_ANSWER = "أهلاً بك! أنا مساعد سارة الحربي. اسألني عن مشاريعها، مهاراتها، شهاداتها، أو طريقة التواصل معها."
FALLBACK = "عذراً، أجيب فقط عن الأسئلة المتعلقة بسارة ومشاريعها ومهاراتها وإنجازاتها. جرّب مثلاً: \"ما هي مشاريع سارة؟\" أو \"كيف أتواصل معها؟\""

_DIACRITICS = re.compile(r"[ً-ْـ]")


def _norm(text: str) -> str:
    text = _DIACRITICS.sub("", text.lower())
    text = re.sub("[أإآ]", "ا", text)
    text = text.replace("ى", "ي").replace("ة", "ه")
    return text


def answer(question: str) -> str:
    q = _norm(question)
    best, best_score = None, 0
    for topic in TOPICS:
        score = sum(len(_norm(k)) for k in topic["keys"] if _norm(k) in q)
        # short latin keys like "ai" must match whole words to avoid false hits
        if score and topic["name"] == "ai" and not re.search(r"\bai\b|ذكاء|agentic|learning|tensorflow|وكلاء|تعلم", q):
            score = 0
        if score > best_score:
            best, best_score = topic, score
    if best:
        return best["answer"]
    if any(_norm(g) in q for g in GREETINGS):
        return GREETING_ANSWER
    return FALLBACK


# ---------------------------------------------------------------------------
# English answers (used when the question contains no Arabic letters)
# ---------------------------------------------------------------------------
ANSWERS_EN = {
    "contact": f"You can reach Sara at:\n- Email: {EMAIL}\n- Phone: {PHONE}\n- LinkedIn: {LINKEDIN}\n- GitHub: {GITHUB}",
    "baseera": "Baseera (June 2026 – present): a B2B SaaS platform powered by Agentic AI that turns finance, sales and inventory data into instant strategic recommendations. Built with Django (MVC) with a hybrid mobile wrapper, secure REST APIs for multi-agent communication, and deployed via GitHub, Render and Cloudflare. Entered in Madaar's \"Engineer It with AI\" competition.",
    "retention": "RetentionAI: a student-dropout risk prediction system with 94.5% accuracy using a hybrid CNN-LSTM model (TensorFlow), a Flask backend with 3 roles (admin, lecturer, student), a MySQL database, real-time analytics dashboards via an async API, and automated CI/CD on Render with Gunicorn.",
    "crm": "Multi-Tier Ticketing & CRM Architecture: a backend system for customer relationship management and ticketing with RBAC permissions. SQL index optimization cut query time by 25%, and it handled 1,000+ support requests with no routing errors.",
    "projects": "Sara's main projects:\n- Baseera: B2B SaaS platform with Agentic AI (Django).\n- RetentionAI: student dropout prediction, 94.5% accuracy (CNN-LSTM).\n- Multi-Tier Ticketing & CRM: ticketing system with RBAC and 25% faster queries.\n- GitHub projects: NYC Taxi Tip Prediction, Predictive Car Features EDA, Online Shoppers Purchase Prediction, Gold Price Tracker Oman, Mini SaaS Task Manager.\nAsk me about any project in detail.",
    "skills": "Sara's technical skills:\n- Web & APIs: Python, Django, ASP.NET Core, PHP, JavaScript, REST APIs, HTML5/CSS3.\n- Databases: PostgreSQL, MySQL, relational schema design, index optimization.\n- DevOps: Git, Docker, CI/CD, Render, Cloudflare, Nginx.\n- AI: Agentic AI, Machine Learning, Deep Learning (TensorFlow, CNN-LSTM).\n- Software engineering: MVC, C4 Models, RBAC.\n- Top skills: Data Analysis, Machine Learning, AI, Data Visualization, Pandas & NumPy.",
    "soft": "Soft skills: analytical and critical thinking, complex problem solving, fast learning, working in multidisciplinary teams, technical report writing, and bilingual (Arabic and English).",
    "education": "Sara holds a B.Sc. in Computer Science and Artificial Intelligence from Gulf College (Cardiff Metropolitan University), 2021–2026, with First Class Honors.",
    "certs": "Sara's certifications:\n- IBM: Make Agentic AI Work for You, Getting Started with Generative AI, Machine Learning with Python, Data Analysis with Python, Python for Data Science, Develop Generative AI Applications: Get Started, Cybersecurity Fundamentals, Build AI Agents using MCP, Agentic AI with LangGraph/CrewAI/AutoGen/BeeAI, Agentic AI with LangChain and LangGraph, Fundamentals of Building AI Agents, Advanced RAG with Vector Databases and Retrievers, Build RAG Applications: Get Started.\n- Google: Google AI Essentials, 5-Day AI Agents Intensive, Discover the Art of Prompting, Introduction to AI, Stay Ahead of the AI Curve, Maximize Productivity With AI Tools.\n- Kaggle: Machine Learning, Pandas, Python, Intro to Programming.\n- University of Michigan: Python Data Structures, Programming for Everybody.\n- Al Nadher Institute: Artificial Intelligence certificate (AI Agents, AI Prompting).\n- Coursera: Google AI Essentials, Google Sheets data analysis fundamentals.",
    "programs": "Sara took part in: Madaar's \"Engineer It with Agentic AI 2026\" competition (intensive Agentic AI bootcamp), the Entrepreneurship Camp for Innovators (University Track, 5 days), and the Majan Programmers program (Angular fundamentals). She also interned at the Ministry of Transport, Communications and Information Technology (Jul–Sep 2026) in IT and AI.",
    "ai": "Sara specializes in AI: Agentic AI (Baseera), and Machine Learning / Deep Learning with TensorFlow (RetentionAI, a CNN-LSTM model with 94.5% accuracy), plus IBM and Google certifications in the field.",
    "location": "Sara is based in Muscat, Sultanate of Oman.",
    "experience": "Sara interned at the Ministry of Transport, Communications and Information Technology (Jul–Sep 2026). She currently works on Baseera (since June 2026), a B2B SaaS platform powered by Agentic AI, and has also built RetentionAI and a Multi-Tier Ticketing & CRM system.",
    "who": "Sara Saleh Alharbi is based in Muscat, Oman, and her specialty is artificial intelligence, focused on AI, machine learning and data analysis with Python. She graduated in Computer Science & AI with First Class Honors and works on Baseera, a B2B SaaS platform with Agentic AI. Ask me about her projects, skills or certifications.",
}
GREETING_EN = "Hello! I'm Sara Alharbi's assistant. Ask me about her projects, skills, certifications, or how to contact her."
FALLBACK_EN = "Sorry, I only answer questions about Sara — her projects, skills and achievements. Try: \"What are Sara's projects?\" or \"How can I contact her?\""

_ARABIC = re.compile(r"[\u0600-\u06FF]")
_answer_ar = answer


def answer(question: str) -> str:  # noqa: F811 — language-aware wrapper
    if _ARABIC.search(question):
        return _answer_ar(question)
    q = _norm(question)
    best, best_score = None, 0
    for topic in TOPICS:
        score = sum(len(k) for k in (_norm(x) for x in topic["keys"]) if k.isascii() and re.search(r"\b" + re.escape(k), q))
        if score > best_score:
            best, best_score = topic, score
    if best:
        return ANSWERS_EN[best["name"]]
    if re.search(r"\b(hi|hello|hey|good (morning|evening))\b", q):
        return GREETING_EN
    return FALLBACK_EN
