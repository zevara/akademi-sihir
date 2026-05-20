"""5 fixed race-determination questions managed by backend, not LLM."""

# Each question has: question text, 4 choices (label + text)
# Answered one at a time, returned by backend based on question_phase

QUESTIONS = [
    {
        "question": "Di masa kecilmu, apa yang paling sering kau lakukan saat waktu senggang?",
        "choices": [
            {"label": "A", "text": "Membaca buku-buku kuno dan merangkai kata-kata indah"},
            {"label": "B", "text": "Berlari di hutan, memanjat pohon, dan bermain dengan hewan"},
            {"label": "C", "text": "Berlatih pedang dan mengasah ketajaman indra"},
            {"label": "D", "text": "Membantu orang tua di tambang atau bengkel kerajinan"},
        ]
    },
    {
        "question": "Apa yang paling kau cari dalam hidup ini?",
        "choices": [
            {"label": "A", "text": "Pengetahuan dan kebijaksanaan yang tak terbatas"},
            {"label": "B", "text": "Kebebasan untuk menjelajahi dunia tanpa batas"},
            {"label": "C", "text": "Kekuasaan dan pengakuan dari semua makhluk"},
            {"label": "D", "text": "Kedamaian dan kehangatan keluarga"},
        ]
    },
    {
        "question": "Bagaimana caramu menghadapi musuh yang jauh lebih kuat?",
        "choices": [
            {"label": "A", "text": "Menggunakan kecerdasan dan strategi, bukan kekuatan"},
            {"label": "B", "text": "Mencari sekutu untuk bertarung bersama"},
            {"label": "C", "text": "Menyerang dari bayang-bayang saat mereka lengah"},
            {"label": "D", "text": "Bertahan dan menguatkan diri sampai cukup kuat"},
        ]
    },
    {
        "question": "Elemen alam apa yang paling kau rasakan keselarasannya dengan jiwamu?",
        "choices": [
            {"label": "A", "text": "Udara — bebas, ringan, dan tak terlihat namun ada di mana-mana"},
            {"label": "B", "text": "Air — mengalir tenang, namun bisa menghanyutkan segalanya"},
            {"label": "C", "text": "Api — membara, menghanguskan, penuh semangat dan amarah"},
            {"label": "D", "text": "Tanah — kokoh, sabar, menjadi fondasi bagi kehidupan"},
        ]
    },
    {
        "question": "Jika kau bisa memilih satu kemampuan sihir di luar nalar, apa yang kau pilih?",
        "choices": [
            {"label": "A", "text": "Membaca dan mengendalikan pikiran makhluk lain"},
            {"label": "B", "text": "Memanggil dan berbicara dengan makhluk dari alam lain"},
            {"label": "C", "text": "Mengendalikan kegelapan dan bayang-bayang"},
            {"label": "D", "text": "Menyembuhkan luka apa pun dan memberi kehidupan"},
        ]
    },
]
