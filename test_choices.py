"""Test the choice parsing and API."""
from backend.main import app, _parse_choices
from fastapi.testclient import TestClient

client = TestClient(app)

# Test health
r = client.get("/api/health")
print("✅ Health:", r.json())

# Test _parse_choices
test_cases = [
    # Case 1: With choices
    (
        """[1] [07:00/01/01/1057] [Luar Gerbang Akademi Qithmir]
—
Kamu berdiri di depan gerbang besar akademi. Suara riuh pendaftaran terdengar dari dalam.
—
- Status (Test):
HP(20/20),EXP(0/50),LV(1),Status(Normal)

[PILIHAN]
A. Masuk ke gerbang akademi
B. Mengamati sekitar gerbang
C. Berbicara dengan penjaga""",
        [
            {"label": "A", "text": "Masuk ke gerbang akademi"},
            {"label": "B", "text": "Mengamati sekitar gerbang"},
            {"label": "C", "text": "Berbicara dengan penjaga"},
        ],
    ),
    # Case 2: No choices section
    ("Halo selamat datang!", []),
    # Case 3: Lowercase pilihan
    (
        """Narasi singkat.

[pilihan]
A. Opsi satu
B. Opsi dua""",
        [
            {"label": "A", "text": "Opsi satu"},
            {"label": "B", "text": "Opsi dua"},
        ],
    ),
]

for i, (text, expected) in enumerate(test_cases, 1):
    narrative, choices = _parse_choices(text)
    assert choices == expected, f"Test {i} failed: got {choices}, expected {expected}"
    print(f"✅ Test {i}: choices OK, narrative length={len(narrative)}")

print("\n🎉 All tests passed!")
