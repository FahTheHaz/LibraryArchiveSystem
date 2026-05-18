from pathlib import Path
from classifier import classify_place

if __name__ == "__main__":
        test_image = Path(r"C:\xampp\htdocs\LAS\backend\uploads\photos\1778729427_7d5f400e.jpeg")
        if not test_image.exists():
                print(f"Test image not found: {test_image}")
        else:
                results = classify_place(test_image)
                print(f"Classification results for {test_image.name}:")
                for label, score in results:
                        print(f"  {label}: {score:.4f}")


