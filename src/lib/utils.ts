import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Pads a 21:9 image to a 2:1 ratio using white pixels via HTML5 Canvas.
 * @param base64 The base64 encoded image string.
 * @returns A promise that resolves to the padded base64 image string.
 */
export function padImageTo21Ratio(base64: string): Promise<string> {
  if (!base64 || typeof base64 !== "string") {
    return Promise.reject(new Error("Invalid base64 string"));
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Handle potential CORS issues if base64 is actually a URL

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        const width = img.width;
        const targetHeight = width / 2;
        const originalHeight = img.height;

        canvas.width = width;
        canvas.height = targetHeight;

        // Fill background with white
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Center the original image vertically
        const yOffset = (targetHeight - originalHeight) / 2;
        ctx.drawImage(img, 0, yOffset, width, originalHeight);

        // Output high-quality PNG
        resolve(canvas.toDataURL("image/png", 1.0));
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = base64;
  });
}
