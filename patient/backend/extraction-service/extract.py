import pymupdf
import io
import sys
import json
import base64

def pdf_page_to_image(pdf_path, page_num=0):
    """Render a single PDF page to PNG and return base64 string."""
    try:
        doc = pymupdf.open(pdf_path)
        page = doc[page_num]
        pix = page.get_pixmap(dpi=150)
        image_bytes = pix.tobytes(output="png")
        doc.close()
        return base64.b64encode(image_bytes).decode("utf-8")
    except Exception as e:
        return {"error": str(e)}

def pdf_to_images(pdf_path):
    """Render all PDF pages to PNG and return list of base64 strings."""
    try:
        doc = pymupdf.open(pdf_path)
        result = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            pix = page.get_pixmap(dpi=150)
            image_bytes = pix.tobytes(output="png")
            result.append(base64.b64encode(image_bytes).decode("utf-8"))
        doc.close()
        return result
    except Exception as e:
        return {"error": str(e)}

def extract_text_from_pdf(pdf_path):
    """
    Backend logic:
    Takes PDF file path as input
    Returns extracted text page-wise
    """
    try:
        # Open PDF
        doc = pymupdf.open(pdf_path)
        
        extracted_data = {}
        
        # Iterate through pages
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text()
            
            # Basic formatting (split paragraphs)
            paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
            
            extracted_data[f"Page_{page_num}"] = paragraphs
        
        doc.close()
        return extracted_data
    except Exception as e:
        return {"error": str(e)}

def is_pdf_digital(pdf_path):
    """
    Checks if the PDF has selectable text.
    """
    try:
        doc = pymupdf.open(pdf_path)
        has_text = False
        for page in doc:
            if page.get_text().strip():
                has_text = True
                break
        doc.close()
        return has_text
    except:
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: extract.py <action> <pdf_path> [page_num]"}))
        sys.exit(1)

    action = sys.argv[1]
    path = sys.argv[2]

    if action == "extract":
        result = extract_text_from_pdf(path)
        print(json.dumps(result))
    elif action == "detect":
        result = is_pdf_digital(path)
        print(json.dumps({"is_digital": result}))
    elif action == "page_to_image":
        page_num = int(sys.argv[3]) if len(sys.argv) > 3 else 0
        result = pdf_page_to_image(path, page_num)
        if isinstance(result, dict) and "error" in result:
            print(json.dumps(result))
        else:
            print(json.dumps({"image": result, "page": page_num}))
    elif action == "to_images":
        result = pdf_to_images(path)
        if isinstance(result, dict) and "error" in result:
            print(json.dumps(result))
        else:
            print(json.dumps({"images": result, "page_count": len(result)}))
    else:
        print(json.dumps({"error": "Unknown action"}))
