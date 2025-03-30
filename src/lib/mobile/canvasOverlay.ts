import * as fs from 'fs';
import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import { OptimizedNode } from './androidViewProcessor';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CanvasOverlay');

// Define the colors to use for different elements (similar to ArbigentCanvas.kt)
const COLORS = [
  '#3F9101', // Green
  '#0E4A8E', // Blue
  '#BCBF01', // Yellow
  '#BC0BA2', // Pink
  '#61AA0D', // Light Green
  '#3D017A', // Purple
  '#D6A60A', // Orange
  '#7710A3', // Purple
  '#A502CE', // Purple
  '#eb5a00', // Orange
];

// Interface for element bounds
interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Interface for element info
interface ElementInfo {
  index: number;
  bounds: ElementBounds;
}

/**
 * Creates an overlay image with element indexes on top of a screenshot
 */
export async function createElementsOverlay(
  screenshotPath: string,
  elements: OptimizedNode[],
  outputPath: string
): Promise<void> {
  try {
    // Load the screenshot image
    const image = await loadImage(screenshotPath);

    // Create a canvas with the same dimensions as the screenshot
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw the screenshot as the background
    ctx.drawImage(image, 0, 0);

    // Draw each element
    elements.forEach((element, index) => {
      drawElement(ctx, element, index);
    });

    // Save the result to a file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);

    logger.info(`Element overlay saved to ${outputPath}`);
  } catch (error) {
    logger.error('Error creating element overlay:', error);
  }
}

/**
 * Draws a single element on the canvas
 */
function drawElement(ctx: CanvasRenderingContext2D, element: OptimizedNode, index: number): void {
  const { bounds } = element;
  if (!bounds) {
    return;
  }
  const color = COLORS[index % COLORS.length];

  // Draw rectangle outline
  drawRectOutline(ctx, bounds, color);

  // Prepare the index text
  const text = index.toString();

  // Calculate text size (simplified)
  ctx.font = 'bold 16px Arial';
  const textWidth = ctx.measureText(text).width;
  const textHeight = 16; // Approximation for the font size

  // Text padding
  const textPadding = 5;
  const boxWidth = textWidth + textPadding * 2;
  const boxHeight = textHeight + textPadding * 2;

  // Position for the index label (at the top of the element)
  const labelX = bounds.x;
  const labelY = Math.max(0, bounds.y - boxHeight);

  // Draw background for the text
  ctx.fillStyle = color;
  ctx.fillRect(labelX, labelY, boxWidth, boxHeight);

  // Draw the index text
  ctx.fillStyle = '#FFFFFF'; // White text
  ctx.fillText(text, labelX + textPadding, labelY + textHeight + textPadding - 2);
}

/**
 * Draws an outline around an element
 */
function drawRectOutline(
  ctx: CanvasRenderingContext2D,
  bounds: ElementBounds,
  color: string
): void {
  const { x, y, width, height } = bounds;

  // Calculate stroke width based on element size (similar to ArbigentCanvas.kt)
  const strokeWidth = Math.max(2, Math.min(width, height) / 20);

  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.strokeRect(x, y, width, height);
}
