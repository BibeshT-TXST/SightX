# ──────────────────────────────────────────────────────────────────────────────
# Retinal Image Preprocessing for V2 Training
# ──────────────────────────────────────────────────────────────────────────────
# This script processes raw EyePACS retinal images ONCE before training.
# It applies the techniques used by Kaggle competition winners:
#   1. Circle crop + black border removal
#   2. Rescale to consistent radius (Ben Graham's technique)
#   3. Local color normalization (Ben Graham's technique)
#   4. CLAHE on the green channel to enhance retinal features
#
# Usage:
#   python preprocess_retinal.py                    # Process all images
#   python preprocess_retinal.py --sample 10        # Process only 10 images (for testing)
#   python preprocess_retinal.py --target-radius 300  # Custom radius (default: 300)
# ──────────────────────────────────────────────────────────────────────────────

import cv2
import numpy as np
import os
import argparse
from multiprocessing import Pool, cpu_count
from functools import partial

# Anchor all paths to the directory where this script lives
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def circle_crop(img):
    """
    Detect the circular retina in a fundus image and crop tightly around it.
    
    EyePACS images have large black borders surrounding the circular retina.
    These black pixels waste model capacity — the network has to learn to 
    ignore them. Removing them lets the model focus entirely on retinal tissue.
    
    Returns the cropped image and the detected radius (for rescaling).
    """
    # Convert to grayscale to find the bright circular retina
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Threshold to separate retina (bright) from background (black)
    # A low threshold catches even dark retinal images
    _, thresh = cv2.threshold(gray, 15, 255, cv2.THRESH_BINARY)
    
    # Find contours — the retina should be the largest bright region
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        # If no contours found, return the original image
        h, w = img.shape[:2]
        return img, min(h, w) // 2
    
    # Get the largest contour (the retina)
    largest = max(contours, key=cv2.contourArea)
    
    # Fit a minimum enclosing circle around the retina
    (cx, cy), radius = cv2.minEnclosingCircle(largest)
    cx, cy, radius = int(cx), int(cy), int(radius)
    
    # Ensure we don't go out of bounds
    h, w = img.shape[:2]
    x1 = max(0, cx - radius)
    y1 = max(0, cy - radius)
    x2 = min(w, cx + radius)
    y2 = min(h, cy + radius)
    
    # Crop to the bounding box of the circle
    cropped = img[y1:y2, x1:x2]
    
    # Create a circular mask to black out corners (keeps only circular retina)
    mask = np.zeros(cropped.shape[:2], dtype=np.uint8)
    crop_h, crop_w = cropped.shape[:2]
    center = (crop_w // 2, crop_h // 2)
    mask_radius = min(crop_w, crop_h) // 2
    cv2.circle(mask, center, mask_radius, 255, -1)
    
    # Apply mask — pixels outside the circle become black
    result = cv2.bitwise_and(cropped, cropped, mask=mask)
    
    return result, mask_radius


def rescale_to_radius(img, target_radius=300):
    """
    Rescale image so the retina has a consistent radius.
    
    Ben Graham (1st place, Kaggle DR competition) used this technique.
    Different cameras produce retinal images at different scales. Without
    rescaling, the model sees some retinas as large and others as tiny,
    making it harder to learn consistent features.
    
    Target radius of 300px gives a final image of ~600×600 pixels.
    """
    h, w = img.shape[:2]
    current_radius = min(h, w) // 2
    
    if current_radius == 0:
        return img
    
    scale = target_radius / current_radius
    new_w = int(w * scale)
    new_h = int(h * scale)
    
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return resized


def ben_graham_color_normalize(img, sigma=None):
    """
    Local color normalization (Ben Graham's technique).
    
    Subtract the local average color from the image and map to 50% gray.
    This compensates for the fact that different fundus cameras produce
    images with wildly different color profiles — some are reddish, some
    are yellowish, some have uneven illumination.
    
    Formula: output = image - gaussian_blur(image) + 128
    
    The Gaussian blur captures the local average color. Subtracting it
    removes global color variations. Adding 128 maps the result to a
    neutral gray baseline.
    """
    h, w = img.shape[:2]
    
    if sigma is None:
        # Sigma should be proportional to image size
        # Ben Graham used a sigma that covers ~10% of the image width
        sigma = max(h, w) * 0.1
    
    # Ensure sigma is odd (required by GaussianBlur)
    ksize = int(sigma * 6) | 1  # 6-sigma kernel, made odd
    ksize = max(ksize, 3)       # Minimum kernel size of 3
    
    # Compute local average via Gaussian blur
    local_avg = cv2.GaussianBlur(img, (ksize, ksize), sigma)
    
    # Subtract local average and add 128 for neutral gray baseline
    # Use float to avoid uint8 underflow
    result = img.astype(np.float32) - local_avg.astype(np.float32) + 128.0
    
    # Clip to valid range and convert back to uint8
    result = np.clip(result, 0, 255).astype(np.uint8)
    
    return result


def apply_clahe_green_channel(img, clip_limit=2.0, tile_size=8):
    """
    Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to the 
    green channel of the fundus image.
    
    The green channel of retinal images best highlights blood vessels and
    lesions — the key features for DR detection. CLAHE enhances local 
    contrast without oversaturating already-bright regions.
    
    The enhanced green channel is merged back with the original red and 
    blue channels to preserve color information.
    """
    # Split into B, G, R channels (OpenCV uses BGR)
    b, g, r = cv2.split(img)
    
    # Create CLAHE object
    clahe = cv2.createCLAHE(
        clipLimit=clip_limit,
        tileGridSize=(tile_size, tile_size)
    )
    
    # Apply CLAHE only to the green channel
    g_enhanced = clahe.apply(g)
    
    # Merge back
    result = cv2.merge([b, g_enhanced, r])
    
    return result


def clip_to_percentage(img, percentage=0.90):
    """
    Clip the image to a percentage of its size to remove boundary artifacts.
    
    Ben Graham clipped to 90% of the image size. The edges of cropped
    retinal images often have artifacts from the circular mask or camera
    vignetting. Removing the outer 10% gives the model cleaner input.
    """
    h, w = img.shape[:2]
    margin_h = int(h * (1 - percentage) / 2)
    margin_w = int(w * (1 - percentage) / 2)
    
    clipped = img[margin_h:h-margin_h, margin_w:w-margin_w]
    return clipped


def preprocess_single_image(filename, raw_dir, out_dir, target_radius):
    """
    Full preprocessing pipeline for a single retinal image.
    Returns (filename, success, error_message).
    """
    try:
        img_path = os.path.join(raw_dir, filename)
        img = cv2.imread(img_path)
        
        if img is None:
            return (filename, False, "Failed to load image")
        
        # Step 1: Circle crop — remove black borders, isolate the retina
        img, _ = circle_crop(img)
        
        # Step 2: Rescale to consistent radius
        img = rescale_to_radius(img, target_radius=target_radius)
        
        # Step 3: Ben Graham's local color normalization
        img = ben_graham_color_normalize(img)
        
        # Step 4: CLAHE on the green channel
        img = apply_clahe_green_channel(img)
        
        # Step 5: Clip to 90% to remove boundary artifacts
        img = clip_to_percentage(img, percentage=0.90)
        
        # Save as PNG (lossless) to avoid further JPEG compression artifacts
        out_name = os.path.splitext(filename)[0] + '.png'
        out_path = os.path.join(out_dir, out_name)
        cv2.imwrite(out_path, img)
        
        return (filename, True, None)
    
    except Exception as e:
        return (filename, False, str(e))


def main():
    parser = argparse.ArgumentParser(description='Preprocess EyePACS retinal images for V2 training')
    parser.add_argument('--sample', type=int, default=None,
                        help='Process only N images (for testing)')
    parser.add_argument('--target-radius', type=int, default=300,
                        help='Target retinal radius in pixels (default: 300)')
    parser.add_argument('--workers', type=int, default=None,
                        help='Number of parallel workers (default: CPU count - 1)')
    args = parser.parse_args()
    
    raw_dir = os.path.join(BASE_DIR, 'data', 'train')
    out_dir = os.path.join(BASE_DIR, 'data', 'train_processed')
    os.makedirs(out_dir, exist_ok=True)
    
    # Get list of images to process
    all_files = [f for f in os.listdir(raw_dir) if f.endswith('.jpeg')]
    all_files.sort()  # Deterministic order
    
    if args.sample:
        all_files = all_files[:args.sample]
    
    total = len(all_files)
    print(f"Preprocessing {total} images...")
    print(f"  Source:        {raw_dir}")
    print(f"  Destination:   {out_dir}")
    print(f"  Target radius: {args.target_radius}px")
    print()
    
    # Use multiprocessing for speed
    num_workers = args.workers or max(1, cpu_count() - 1)
    process_fn = partial(preprocess_single_image,
                         raw_dir=raw_dir,
                         out_dir=out_dir,
                         target_radius=args.target_radius)
    
    successes = 0
    failures = 0
    
    with Pool(num_workers) as pool:
        for i, (filename, success, error) in enumerate(pool.imap_unordered(process_fn, all_files)):
            if success:
                successes += 1
            else:
                failures += 1
                print(f"  ✗ Failed: {filename} — {error}")
            
            # Progress update every 500 images
            if (i + 1) % 500 == 0 or (i + 1) == total:
                pct = (i + 1) / total * 100
                print(f"  [{i+1}/{total}] {pct:.1f}% complete "
                      f"({successes} ok, {failures} failed)")
    
    print(f"\nDone! {successes}/{total} images preprocessed successfully.")
    if failures > 0:
        print(f"  ⚠ {failures} images failed — check errors above.")


if __name__ == '__main__':
    main()
