# image_path = r"D:\Pictures\CS pics\cxrzelj2zct91.jpg"  # Change this to your image file name
# "D:\Pictures\CS pics\index ME.jpg"
image_path = r"C:\xampp\htdocs\LAS\backend\uploads\photos\1778729427_d865a8ee.jpeg"  
PLACE_LABELS_FALLBACK = {
    0: "a photo of a beach",
        1: "a photo of a forest",
        2: "a photo of a man wearing headphones",
        3: "a photo of a mountain",
        4: "a library with bookshelves and reading tables",
        5: "thumbs up",
        6: "a handsome person",
        7: "a photo of a cosmic night sky",
        8: "a photo of a house",
        9: "a photo of a car"

}
results = []

try:
        import torch
        import open_clip
        from PIL import Image
        # what's PIL? Python Imaging Library, a library for opening, manipulating, and saving many different image file formats

        _model, _, _preprocess = open_clip.create_model_and_transforms(
            'ViT-B-32', pretrained='openai')
        _tokenizer = open_clip.get_tokenizer('ViT-B-32')
        _model.eval()
        image = _preprocess(Image.open(image_path)).unsqueeze(0)
        texts = _tokenizer(list(PLACE_LABELS_FALLBACK.values()))
        with torch.no_grad():
            img_feat = _model.encode_image(image)
            txt_feat = _model.encode_text(texts)
            img_feat /= img_feat.norm(dim=-1, keepdim=True)
            txt_feat /= txt_feat.norm(dim=-1, keepdim=True)
            scores = (img_feat @ txt_feat.T).softmax(dim=-1)[0].tolist()
        results= sorted(zip(PLACE_LABELS_FALLBACK.keys(), scores), key=lambda x: -x[1])
        for label, prob in results:
                print(f"{label}: {prob * 100:.2f}%")
except ImportError:
        print(f"  [classify_place] CLIP not installed — skipping place classification")

print("\n--- CLIP Predictions ---")

for label, prob in results:
    print(f"{label}: {prob * 100:.2f}%")



